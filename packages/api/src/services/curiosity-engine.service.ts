/**
 * Curiosity Engine Service
 *
 * A production-ready curiosity-driven data layer that tracks, analyzes, and
 * leverages learner curiosity signals to power adaptive learning experiences.
 *
 * Features:
 * - Curiosity signal recording and classification
 * - Interest cluster detection via agglomerative clustering on co-occurrence matrices
 * - Emerging interest detection via signal acceleration analysis
 * - Composite curiosity scoring (breadth, depth, question frequency, exploration rate)
 * - Content suggestion generation aligned to curiosity profiles
 * - Curiosity trigger identification from peer activity patterns
 * - Profile caching with 5-minute TTL for performance
 *
 * Error codes: CURIO_001 through CURIO_099
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import type {
  CuriositySignalType,
  CuriositySignal,
  InterestCluster,
  CuriosityProfile,
  EmergingInterest,
  ContentSuggestion,
  CuriosityTrigger,
} from './golden-path-types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Profile cache TTL in milliseconds (5 minutes) */
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Signal lookback window for profile computation (30 days) */
const SIGNAL_LOOKBACK_DAYS = 30;

/** Expected daily signals for normalization */
const EXPECTED_DAILY_SIGNALS = 10;

/** Co-occurrence merge threshold for agglomerative clustering */
const CLUSTER_MERGE_THRESHOLD = 0.3;

/** Acceleration threshold for emerging interest detection */
const EMERGING_ACCELERATION_THRESHOLD = 2.0;

/** Days for recent rate in emerging interest detection */
const RECENT_WINDOW_DAYS = 3;

/** Days for historical rate in emerging interest detection */
const HISTORICAL_WINDOW_DAYS = 3;

/** Default content suggestion limit */
const DEFAULT_SUGGESTION_LIMIT = 10;

/** Default curiosity trigger limit */
const DEFAULT_TRIGGER_LIMIT = 10;

// ============================================================================
// ERROR CODES
// ============================================================================

const CuriosityErrors = {
  CURIO_001: { code: 'CURIO_001', message: 'Invalid curiosity signal data' },
  CURIO_002: { code: 'CURIO_002', message: 'Failed to record curiosity signal' },
  CURIO_003: { code: 'CURIO_003', message: 'Failed to retrieve curiosity profile' },
  CURIO_004: { code: 'CURIO_004', message: 'Failed to compute interest clusters' },
  CURIO_005: { code: 'CURIO_005', message: 'Failed to detect emerging interests' },
  CURIO_006: { code: 'CURIO_006', message: 'Failed to compute curiosity score' },
  CURIO_007: { code: 'CURIO_007', message: 'Failed to generate content suggestions' },
  CURIO_008: { code: 'CURIO_008', message: 'Failed to find curiosity triggers' },
  CURIO_009: { code: 'CURIO_009', message: 'Failed to refresh profile cache' },
  CURIO_010: { code: 'CURIO_010', message: 'Learner ID is required' },
  CURIO_011: { code: 'CURIO_011', message: 'Tenant ID is required' },
  CURIO_012: { code: 'CURIO_012', message: 'Signal type is required' },
  CURIO_013: { code: 'CURIO_013', message: 'Topic ID is required' },
  CURIO_014: { code: 'CURIO_014', message: 'Session ID is required in signal context' },
  CURIO_015: { code: 'CURIO_015', message: 'No signals found for learner' },
} as const;

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface SignalInput {
  signalType: CuriositySignalType;
  topicId: string;
  topicName: string;
  domain: string;
  strength?: number;
  context: {
    sessionId: string;
    contentId?: string;
    dwellTimeMs?: number;
    referringTopicId?: string;
    searchQuery?: string;
  };
}

interface CoOccurrenceMatrix {
  topics: string[];
  matrix: number[][];
  topicNameMap: Map<string, string>;
  topicDomainMap: Map<string, string>;
  topicSignalCounts: Map<string, number>;
}

interface ClusterNode {
  id: string;
  topics: string[];
}

interface ContentSuggestionOptions {
  limit?: number;
  domain?: string;
}

interface CuriosityTriggerOptions {
  domain?: string;
  limit?: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class CuriosityEngineService extends ScholarlyBaseService {
  constructor() {
    super('CuriosityEngineService');
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Record a curiosity signal from learner activity.
   *
   * After recording, checks whether the profile cache is stale (>5 min)
   * and triggers an async background refresh if needed.
   */
  async recordSignal(
    tenantId: string,
    learnerId: string,
    signal: SignalInput
  ): Promise<Result<CuriositySignal>> {
    return this.withTiming('recordSignal', async () => {
      // Validate inputs
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }
      if (!signal.signalType) {
        return failure(CuriosityErrors.CURIO_012);
      }
      if (!signal.topicId) {
        return failure(CuriosityErrors.CURIO_013);
      }
      if (!signal.context?.sessionId) {
        return failure(CuriosityErrors.CURIO_014);
      }

      try {
        const strength = signal.strength != null
          ? Math.max(0, Math.min(1, signal.strength))
          : 0.5;

        const record = await prisma.curiositySignal.create({
          data: {
            tenantId,
            learnerId,
            signalType: signal.signalType,
            topicId: signal.topicId,
            topicName: signal.topicName,
            domain: signal.domain,
            strength,
            context: signal.context as Record<string, unknown>,
            recordedAt: new Date(),
          },
        });

        const recorded: CuriositySignal = {
          id: record.id,
          tenantId: record.tenantId,
          learnerId: record.learnerId,
          signalType: record.signalType as CuriositySignalType,
          topicId: record.topicId,
          topicName: record.topicName,
          domain: record.domain,
          strength: record.strength,
          context: record.context as CuriositySignal['context'],
          recordedAt: record.recordedAt,
        };

        log.info('Curiosity signal recorded', {
          tenantId,
          learnerId,
          signalType: signal.signalType,
          topicId: signal.topicId,
        });

        // Check if profile cache needs refreshing (async, non-blocking)
        this.maybeRefreshProfileCache(tenantId, learnerId).catch((err) => {
          log.error('Background profile cache refresh failed', err as Error, {
            tenantId,
            learnerId,
          });
        });

        return success(recorded);
      } catch (error) {
        log.error('Failed to record curiosity signal', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_002,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Get the full curiosity profile for a learner.
   *
   * Returns a cached profile if it is still fresh (<5 minutes old).
   * Otherwise computes a fresh profile from raw signals, caches it,
   * and returns it.
   */
  async getCuriosityProfile(
    tenantId: string,
    learnerId: string
  ): Promise<Result<CuriosityProfile>> {
    return this.withTiming('getCuriosityProfile', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        // Check for a fresh cached profile
        const cached = await prisma.curiosityProfileCache.findUnique({
          where: { learnerId },
        });

        if (cached) {
          const age = Date.now() - cached.lastUpdated.getTime();
          if (age < PROFILE_CACHE_TTL_MS) {
            log.debug('Returning cached curiosity profile', { tenantId, learnerId });
            return success(this.cacheToProfile(cached, learnerId));
          }
        }

        // Compute fresh profile
        const profile = await this.computeProfile(tenantId, learnerId);

        // Persist to cache
        await this.persistProfileCache(tenantId, learnerId, profile);

        return success(profile);
      } catch (error) {
        log.error('Failed to get curiosity profile', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_003,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Build interest clusters for a learner using co-occurrence-based
   * agglomerative clustering.
   */
  async getInterestClusters(
    tenantId: string,
    learnerId: string
  ): Promise<Result<InterestCluster[]>> {
    return this.withTiming('getInterestClusters', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        const cutoff = new Date(Date.now() - SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
        const signals = await this.fetchSignals(tenantId, learnerId, cutoff);

        if (signals.length === 0) {
          return success([]);
        }

        const clusters = this.buildInterestClusters(signals);
        return success(clusters);
      } catch (error) {
        log.error('Failed to compute interest clusters', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_004,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Detect emerging interests by analyzing signal acceleration over time.
   *
   * An interest is "emerging" if the recent signal rate (last 3 days) is
   * at least 2x the historical rate (days 4-6).
   */
  async detectEmergingInterests(
    tenantId: string,
    learnerId: string
  ): Promise<Result<EmergingInterest[]>> {
    return this.withTiming('detectEmergingInterests', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const signals = await this.fetchSignals(tenantId, learnerId, sevenDaysAgo);

        if (signals.length === 0) {
          return success([]);
        }

        const emerging = this.computeEmergingInterests(signals, now);
        return success(emerging);
      } catch (error) {
        log.error('Failed to detect emerging interests', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_005,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Get the curiosity score components without the full profile overhead.
   * This is a lightweight call that returns just the numeric breakdown.
   */
  async getCuriosityScore(
    tenantId: string,
    learnerId: string
  ): Promise<Result<{ overallScore: number; components: CuriosityProfile['components'] }>> {
    return this.withTiming('getCuriosityScore', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        // Try the cache first
        const cached = await prisma.curiosityProfileCache.findUnique({
          where: { learnerId },
        });

        if (cached) {
          const age = Date.now() - cached.lastUpdated.getTime();
          if (age < PROFILE_CACHE_TTL_MS) {
            return success({
              overallScore: cached.overallScore,
              components: {
                signalCount: cached.signalCount,
                breadth: cached.breadthScore,
                depth: cached.depthScore,
                questionFrequency: cached.questionFrequency,
                explorationRate: cached.explorationRate,
              },
            });
          }
        }

        // Compute from raw signals
        const cutoff = new Date(Date.now() - SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
        const signals = await this.fetchSignals(tenantId, learnerId, cutoff);
        const { overallScore, components } = this.computeScoreComponents(signals);

        return success({ overallScore, components });
      } catch (error) {
        log.error('Failed to compute curiosity score', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_006,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Generate content suggestions aligned to the learner's curiosity profile.
   *
   * Each suggestion is scored by curiosity alignment, peer popularity,
   * and cross-curricular bonus.
   */
  async getContentSuggestions(
    tenantId: string,
    learnerId: string,
    options?: ContentSuggestionOptions
  ): Promise<Result<ContentSuggestion[]>> {
    return this.withTiming('getContentSuggestions', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        const limit = options?.limit ?? DEFAULT_SUGGESTION_LIMIT;
        const domainFilter = options?.domain;

        // Get learner's interest clusters
        const cutoff = new Date(Date.now() - SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
        const signals = await this.fetchSignals(tenantId, learnerId, cutoff);
        const clusters = this.buildInterestClusters(signals);

        if (clusters.length === 0) {
          return success([]);
        }

        // Gather topics the learner has already interacted with
        const seenContentIds = new Set(
          signals
            .map((s) => s.context.contentId)
            .filter((id): id is string => id != null)
        );

        // Collect the learner's topic set for alignment scoring
        const learnerTopics = new Set(signals.map((s) => s.topicId));
        const learnerDomains = new Set(signals.map((s) => s.domain));

        // Find candidate content from signals of other learners in same tenant
        const peerSignals = await prisma.curiositySignal.findMany({
          where: {
            tenantId,
            learnerId: { not: learnerId },
            recordedAt: { gte: cutoff },
            ...(domainFilter ? { domain: domainFilter } : {}),
          },
          orderBy: { recordedAt: 'desc' },
          take: 500,
        });

        // Build candidate content map
        const contentMap = new Map<
          string,
          {
            contentId: string;
            topics: Set<string>;
            domains: Set<string>;
            topicNames: Set<string>;
            peerCount: number;
          }
        >();

        for (const ps of peerSignals) {
          const ctx = ps.context as Record<string, unknown>;
          const contentId = ctx.contentId as string | undefined;
          if (!contentId || seenContentIds.has(contentId)) continue;

          let entry = contentMap.get(contentId);
          if (!entry) {
            entry = {
              contentId,
              topics: new Set(),
              domains: new Set(),
              topicNames: new Set(),
              peerCount: 0,
            };
            contentMap.set(contentId, entry);
          }
          entry.topics.add(ps.topicId);
          entry.domains.add(ps.domain);
          entry.topicNames.add(ps.topicName);
          entry.peerCount++;
        }

        // Score each candidate
        const contentValues = Array.from(contentMap.values());
        const maxPeerCount = Math.max(
          1,
          ...contentValues.map((c) => c.peerCount)
        );

        const suggestions: ContentSuggestion[] = [];

        contentValues.forEach((entry) => {
          // Curiosity alignment: fraction of content topics that overlap with learner topics
          const entryTopics: string[] = Array.from(entry.topics);
          const entryDomains: string[] = Array.from(entry.domains);
          const entryTopicNames: string[] = Array.from(entry.topicNames);

          const topicOverlap = entryTopics.filter((t) => learnerTopics.has(t)).length;
          const curiosityAlignment = entryTopics.length > 0
            ? topicOverlap / entryTopics.length
            : 0;

          // Peer popularity: normalized by max peer engagement
          const peerPopularity = entry.peerCount / maxPeerCount;

          // Cross-curricular: content spans more than one domain the learner knows
          const domainOverlap = entryDomains.filter((d) => learnerDomains.has(d)).length;
          const crossCurricular = entryDomains.length > 1 && domainOverlap >= 1;

          // Weighted relevance score
          const relevanceScore = Math.min(
            1,
            curiosityAlignment * 0.45 +
            peerPopularity * 0.25 +
            (crossCurricular ? 0.15 : 0) +
            // Novelty bonus for topics the learner hasn't explored yet
            (1 - curiosityAlignment) * 0.15
          );

          // Build a descriptive title from topic names
          const title = entryTopicNames.slice(0, 3).join(', ');

          const reasoning = this.buildSuggestionReasoning(
            curiosityAlignment,
            peerPopularity,
            crossCurricular,
            entryTopicNames
          );

          suggestions.push({
            contentId: entry.contentId,
            title,
            domain: entryDomains[0],
            topics: entryTopics,
            relevanceScore,
            curiosityAlignment,
            peerPopularity,
            crossCurricular,
            reasoning,
          });
        });

        // Sort by relevance and return top N
        suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return success(suggestions.slice(0, limit));
      } catch (error) {
        log.error('Failed to generate content suggestions', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_007,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Find content that historically triggered curiosity in similar learners.
   *
   * Identifies content that preceded voluntary_exploration or topic_deep_dive
   * signals in peer learners, scored by trigger frequency and learner similarity.
   */
  async findCuriosityTriggers(
    tenantId: string,
    learnerId: string,
    options?: CuriosityTriggerOptions
  ): Promise<Result<CuriosityTrigger[]>> {
    return this.withTiming('findCuriosityTriggers', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        const limit = options?.limit ?? DEFAULT_TRIGGER_LIMIT;
        const domainFilter = options?.domain;
        const cutoff = new Date(Date.now() - SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

        // Get the requesting learner's topic set for similarity scoring
        const learnerSignals = await this.fetchSignals(tenantId, learnerId, cutoff);
        const learnerTopics = new Set(learnerSignals.map((s) => s.topicId));

        // Find curiosity-indicative signals from other learners
        const curiositySignalTypes: CuriositySignalType[] = [
          'voluntary_exploration',
          'topic_deep_dive',
        ];

        const peerCuriositySignals = await prisma.curiositySignal.findMany({
          where: {
            tenantId,
            learnerId: { not: learnerId },
            signalType: { in: curiositySignalTypes },
            recordedAt: { gte: cutoff },
            ...(domainFilter ? { domain: domainFilter } : {}),
          },
          orderBy: { recordedAt: 'desc' },
          take: 1000,
        });

        // Group peer curiosity signals by session
        const sessionSignals = new Map<string, typeof peerCuriositySignals>();
        for (const sig of peerCuriositySignals) {
          const ctx = sig.context as Record<string, unknown>;
          const sessionId = ctx.sessionId as string | undefined;
          if (!sessionId) continue;
          const existing = sessionSignals.get(sessionId) ?? [];
          existing.push(sig);
          sessionSignals.set(sessionId, existing);
        }

        // For each session with curiosity signals, find what content preceded them.
        // The contentId on the signal itself, or the referringTopicId, is our "trigger."
        const triggerCounts = new Map<
          string,
          {
            contentId: string;
            domain: string;
            topicNames: Set<string>;
            totalSignals: number;
            peerLearners: Set<string>;
            peerTopics: Set<string>;
          }
        >();

        Array.from(sessionSignals.values()).forEach((sessionSigs) => {
          for (const sig of sessionSigs) {
            const ctx = sig.context as Record<string, unknown>;
            const contentId = ctx.contentId as string | undefined;
            if (!contentId) continue;

            let entry = triggerCounts.get(contentId);
            if (!entry) {
              entry = {
                contentId,
                domain: sig.domain,
                topicNames: new Set<string>(),
                totalSignals: 0,
                peerLearners: new Set<string>(),
                peerTopics: new Set<string>(),
              };
              triggerCounts.set(contentId, entry);
            }
            entry.totalSignals++;
            entry.peerLearners.add(sig.learnerId);
            entry.topicNames.add(sig.topicName);
            entry.peerTopics.add(sig.topicId);
          }
        });

        // Score each trigger
        const triggerValues = Array.from(triggerCounts.values());
        const maxSignals = Math.max(
          1,
          ...triggerValues.map((t) => t.totalSignals)
        );

        const triggers: CuriosityTrigger[] = [];
        const learnerTopicsArr: string[] = Array.from(learnerTopics);

        triggerValues.forEach((entry) => {
          // Trigger score: normalized by the highest signal count
          const triggerScore = entry.totalSignals / maxSignals;

          // Learner similarity: Jaccard coefficient between peer topics and learner topics
          const peerTopicsArr: string[] = Array.from(entry.peerTopics);
          const intersectionSize = peerTopicsArr.filter((t) => learnerTopics.has(t)).length;
          const allTopics = new Set<string>([...peerTopicsArr, ...learnerTopicsArr]);
          const unionSize = allTopics.size;
          const learnerSimilarity = unionSize > 0 ? intersectionSize / unionSize : 0;

          // Final composite score
          const finalScore = triggerScore * 0.6 + learnerSimilarity * 0.4;

          const topicNamesArr: string[] = Array.from(entry.topicNames);
          const title = topicNamesArr.slice(0, 3).join(', ');

          triggers.push({
            contentId: entry.contentId,
            title,
            domain: entry.domain,
            triggerScore: Math.round(finalScore * 1000) / 1000,
            learnerSimilarity: Math.round(learnerSimilarity * 1000) / 1000,
            historicalSignals: entry.totalSignals,
          });
        });

        // Sort by composite trigger score descending
        triggers.sort((a, b) => b.triggerScore - a.triggerScore);
        return success(triggers.slice(0, limit));
      } catch (error) {
        log.error('Failed to find curiosity triggers', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_008,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Convenience wrapper around detectEmergingInterests with caching.
   *
   * Uses the profile cache's emergingInterests field when fresh,
   * falling back to a full computation otherwise.
   */
  async getEmergingInterests(
    tenantId: string,
    learnerId: string
  ): Promise<Result<EmergingInterest[]>> {
    return this.withTiming('getEmergingInterests', async () => {
      if (!tenantId) {
        return failure(CuriosityErrors.CURIO_011);
      }
      if (!learnerId) {
        return failure(CuriosityErrors.CURIO_010);
      }

      try {
        // Try to return from cached profile
        const cached = await prisma.curiosityProfileCache.findUnique({
          where: { learnerId },
        });

        if (cached) {
          const age = Date.now() - cached.lastUpdated.getTime();
          if (age < PROFILE_CACHE_TTL_MS) {
            const emerging = (cached.emergingInterests ?? []) as unknown as EmergingInterest[];
            return success(emerging);
          }
        }

        // Fall back to full computation
        const result = await this.detectEmergingInterests(tenantId, learnerId);
        return result;
      } catch (error) {
        log.error('Failed to get emerging interests', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          ...CuriosityErrors.CURIO_005,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Fetch curiosity signals for a learner from the database.
   */
  private async fetchSignals(
    tenantId: string,
    learnerId: string,
    since: Date
  ): Promise<CuriositySignal[]> {
    const records = await prisma.curiositySignal.findMany({
      where: {
        tenantId,
        learnerId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
    });

    return records.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      learnerId: r.learnerId,
      signalType: r.signalType as CuriositySignalType,
      topicId: r.topicId,
      topicName: r.topicName,
      domain: r.domain,
      strength: r.strength,
      context: r.context as CuriositySignal['context'],
      recordedAt: r.recordedAt,
    }));
  }

  /**
   * Compute a full curiosity profile from raw signals.
   */
  private async computeProfile(
    tenantId: string,
    learnerId: string
  ): Promise<CuriosityProfile> {
    const cutoff = new Date(Date.now() - SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const signals = await this.fetchSignals(tenantId, learnerId, cutoff);

    const { overallScore, components } = this.computeScoreComponents(signals);
    const clusters = this.buildInterestClusters(signals);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSignals = signals.filter((s) => s.recordedAt >= sevenDaysAgo);
    const emerging = this.computeEmergingInterests(recentSignals.length > 0 ? signals : [], now);

    // Take the 20 most recent signals for the profile
    const latest = signals.slice(-20);

    return {
      learnerId,
      overallScore,
      components,
      clusters,
      emergingInterests: emerging,
      recentSignals: latest,
      lastUpdated: now,
    };
  }

  /**
   * Compute the curiosity score components from a set of signals.
   *
   * The overall score is a weighted composite (0-100):
   *   signalCount    (weight 0.15): normalized by expected_daily_signals * 30
   *   breadth        (weight 0.20): unique topics / total available topics * 100
   *   depth          (weight 0.25): average signals per topic for top-5 topics
   *   questionFreq   (weight 0.20): question_asking / total * 100
   *   explorationRate(weight 0.20): voluntary_exploration / total * 100
   */
  private computeScoreComponents(
    signals: CuriositySignal[]
  ): { overallScore: number; components: CuriosityProfile['components'] } {
    if (signals.length === 0) {
      return {
        overallScore: 0,
        components: {
          signalCount: 0,
          breadth: 0,
          depth: 0,
          questionFrequency: 0,
          explorationRate: 0,
        },
      };
    }

    const totalSignals = signals.length;
    const expectedTotal = EXPECTED_DAILY_SIGNALS * SIGNAL_LOOKBACK_DAYS;

    // Signal count component (0-100)
    const signalCountScore = Math.min(100, (totalSignals / expectedTotal) * 100);

    // Breadth: unique topics explored
    const uniqueTopics = new Set(signals.map((s) => s.topicId));
    // Estimate "total available topics" from all unique topics across tenants
    // For practical purposes, normalize against a reasonable ceiling (50 topics)
    const topicCeiling = Math.max(50, uniqueTopics.size);
    const breadthScore = Math.min(100, (uniqueTopics.size / topicCeiling) * 100);

    // Depth: average signals per topic for the top-5 most-explored topics
    const topicCounts = new Map<string, number>();
    for (const s of signals) {
      topicCounts.set(s.topicId, (topicCounts.get(s.topicId) ?? 0) + 1);
    }
    const sortedTopicCounts = Array.from(topicCounts.values()).sort((a, b) => b - a);
    const top5 = sortedTopicCounts.slice(0, 5);
    const avgTop5 = top5.length > 0
      ? top5.reduce((sum, c) => sum + c, 0) / top5.length
      : 0;
    // Normalize depth: 10+ avg signals in top-5 topics = 100
    const depthScore = Math.min(100, (avgTop5 / 10) * 100);

    // Question frequency: fraction of signals that are question_asking
    const questionSignals = signals.filter((s) => s.signalType === 'question_asking').length;
    const questionFrequency = Math.min(100, (questionSignals / totalSignals) * 100);

    // Exploration rate: fraction of signals that are voluntary_exploration
    const explorationSignals = signals.filter(
      (s) => s.signalType === 'voluntary_exploration'
    ).length;
    const explorationRate = Math.min(100, (explorationSignals / totalSignals) * 100);

    // Weighted composite
    const overallScore = Math.min(
      100,
      Math.round(
        signalCountScore * 0.15 +
        breadthScore * 0.20 +
        depthScore * 0.25 +
        questionFrequency * 0.20 +
        explorationRate * 0.20
      )
    );

    return {
      overallScore,
      components: {
        signalCount: Math.round(signalCountScore * 100) / 100,
        breadth: Math.round(breadthScore * 100) / 100,
        depth: Math.round(depthScore * 100) / 100,
        questionFrequency: Math.round(questionFrequency * 100) / 100,
        explorationRate: Math.round(explorationRate * 100) / 100,
      },
    };
  }

  /**
   * Build interest clusters using co-occurrence-based agglomerative clustering.
   *
   * 1. Group signals by session
   * 2. Build co-occurrence matrix (topic pairs that appear in the same session)
   * 3. Agglomerative merge until max co-occurrence < threshold
   */
  private buildInterestClusters(signals: CuriositySignal[]): InterestCluster[] {
    if (signals.length === 0) return [];

    const coMatrix = this.buildCoOccurrenceMatrix(signals);
    if (coMatrix.topics.length === 0) return [];

    const clusterAssignments = this.agglomerativeClustering(coMatrix, CLUSTER_MERGE_THRESHOLD);

    // Build InterestCluster objects from merged clusters
    const clusters: InterestCluster[] = [];
    const now = new Date();

    for (let i = 0; i < clusterAssignments.length; i++) {
      const cluster = clusterAssignments[i];
      const topics = cluster.topics;
      if (topics.length === 0) continue;

      const topicNames = topics
        .map((t) => coMatrix.topicNameMap.get(t) ?? t)
        .filter((name, idx, arr) => arr.indexOf(name) === idx);

      const domains = topics
        .map((t) => coMatrix.topicDomainMap.get(t) ?? 'unknown')
        .filter((d, idx, arr) => arr.indexOf(d) === idx);

      const signalCount = topics.reduce(
        (sum, t) => sum + (coMatrix.topicSignalCounts.get(t) ?? 0),
        0
      );

      // Cluster strength: average normalized co-occurrence within the cluster
      let intraCoOccurrence = 0;
      let pairCount = 0;
      for (let a = 0; a < topics.length; a++) {
        for (let b = a + 1; b < topics.length; b++) {
          const idxA = coMatrix.topics.indexOf(topics[a]);
          const idxB = coMatrix.topics.indexOf(topics[b]);
          if (idxA >= 0 && idxB >= 0) {
            intraCoOccurrence += coMatrix.matrix[idxA][idxB];
            pairCount++;
          }
        }
      }
      const strength = pairCount > 0
        ? Math.min(1, intraCoOccurrence / pairCount)
        : topics.length === 1 ? 0.5 : 0;

      // Emerging score: proportion of signals in the last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const topicSet = new Set(topics);
      const recentSignals = signals.filter(
        (s) => topicSet.has(s.topicId) && s.recordedAt >= sevenDaysAgo
      );
      const totalTopicSignals = signals.filter((s) => topicSet.has(s.topicId));
      const emergingScore = totalTopicSignals.length > 0
        ? Math.min(1, recentSignals.length / totalTopicSignals.length)
        : 0;

      // Last activity
      const clusterSignals = signals.filter((s) => topicSet.has(s.topicId));
      const lastActivityAt = clusterSignals.length > 0
        ? clusterSignals[clusterSignals.length - 1].recordedAt
        : now;

      clusters.push({
        id: this.generateId('cluster'),
        topics,
        topicNames,
        strength: Math.round(strength * 1000) / 1000,
        signalCount,
        domains,
        lastActivityAt,
        emergingScore: Math.round(emergingScore * 1000) / 1000,
      });
    }

    // Sort clusters by signal count descending
    clusters.sort((a, b) => b.signalCount - a.signalCount);
    return clusters;
  }

  /**
   * Build a co-occurrence matrix from session-grouped signals.
   *
   * For each session, every pair of distinct topics that appear together
   * increments their co-occurrence count. The matrix is then normalized
   * by the maximum co-occurrence value.
   */
  private buildCoOccurrenceMatrix(signals: CuriositySignal[]): CoOccurrenceMatrix {
    // Collect unique topics and their metadata
    const topicSet = new Set<string>();
    const topicNameMap = new Map<string, string>();
    const topicDomainMap = new Map<string, string>();
    const topicSignalCounts = new Map<string, number>();

    for (const s of signals) {
      topicSet.add(s.topicId);
      topicNameMap.set(s.topicId, s.topicName);
      topicDomainMap.set(s.topicId, s.domain);
      topicSignalCounts.set(s.topicId, (topicSignalCounts.get(s.topicId) ?? 0) + 1);
    }

    const topics = Array.from(topicSet);
    const n = topics.length;
    const topicIndex = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      topicIndex.set(topics[i], i);
    }

    // Initialize NxN matrix with zeros
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    // Group signals by session
    const sessionGroups = new Map<string, CuriositySignal[]>();
    for (const s of signals) {
      const sessionId = s.context.sessionId;
      if (!sessionId) continue;
      const group = sessionGroups.get(sessionId) ?? [];
      group.push(s);
      sessionGroups.set(sessionId, group);
    }

    // For each session, increment co-occurrence for every pair of topics
    Array.from(sessionGroups.values()).forEach((sessionSigs) => {
      const sessionTopicSet = new Set<string>(sessionSigs.map((s) => s.topicId));
      const sessionTopics: string[] = Array.from(sessionTopicSet);
      for (let i = 0; i < sessionTopics.length; i++) {
        for (let j = i + 1; j < sessionTopics.length; j++) {
          const idxA = topicIndex.get(sessionTopics[i])!;
          const idxB = topicIndex.get(sessionTopics[j])!;
          matrix[idxA][idxB]++;
          matrix[idxB][idxA]++;
        }
      }
    });

    // Normalize by the maximum co-occurrence value
    let maxVal = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (matrix[i][j] > maxVal) {
          maxVal = matrix[i][j];
        }
      }
    }

    if (maxVal > 0) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrix[i][j] = matrix[i][j] / maxVal;
        }
      }
    }

    return { topics, matrix, topicNameMap, topicDomainMap, topicSignalCounts };
  }

  /**
   * Agglomerative clustering on a co-occurrence matrix.
   *
   * Algorithm:
   * 1. Start with each topic as its own cluster.
   * 2. Find the pair of clusters with the highest average co-occurrence
   *    (average linkage).
   * 3. If that value >= threshold, merge the two clusters.
   * 4. Repeat until no pair exceeds the threshold.
   */
  private agglomerativeClustering(
    coMatrix: CoOccurrenceMatrix,
    threshold: number
  ): ClusterNode[] {
    const { topics, matrix } = coMatrix;

    // Initialize each topic as its own cluster
    let clusters: ClusterNode[] = topics.map((t, i) => ({
      id: `c_${i}`,
      topics: [t],
    }));

    // Helper: compute average linkage between two clusters
    const averageLinkage = (clusterA: ClusterNode, clusterB: ClusterNode): number => {
      let sum = 0;
      let count = 0;
      for (const tA of clusterA.topics) {
        for (const tB of clusterB.topics) {
          const idxA = topics.indexOf(tA);
          const idxB = topics.indexOf(tB);
          if (idxA >= 0 && idxB >= 0 && idxA !== idxB) {
            sum += matrix[idxA][idxB];
            count++;
          }
        }
      }
      return count > 0 ? sum / count : 0;
    };

    // Iteratively merge closest clusters
    let mergeOccurred = true;
    while (mergeOccurred && clusters.length > 1) {
      mergeOccurred = false;

      let bestI = -1;
      let bestJ = -1;
      let bestScore = -1;

      // Find the pair with the highest average linkage
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const score = averageLinkage(clusters[i], clusters[j]);
          if (score > bestScore) {
            bestScore = score;
            bestI = i;
            bestJ = j;
          }
        }
      }

      // Merge if above threshold
      if (bestScore >= threshold && bestI >= 0 && bestJ >= 0) {
        const merged: ClusterNode = {
          id: `c_${clusters[bestI].id}_${clusters[bestJ].id}`,
          topics: [...clusters[bestI].topics, ...clusters[bestJ].topics],
        };

        // Remove the two clusters and add the merged one
        const newClusters: ClusterNode[] = [];
        for (let k = 0; k < clusters.length; k++) {
          if (k !== bestI && k !== bestJ) {
            newClusters.push(clusters[k]);
          }
        }
        newClusters.push(merged);
        clusters = newClusters;
        mergeOccurred = true;
      }
    }

    return clusters;
  }

  /**
   * Compute emerging interests by analyzing signal acceleration.
   *
   * For each topic:
   *   recentRate    = signals in last 3 days / 3
   *   historicalRate = signals in days 4-6 / 3
   *   acceleration  = recentRate / max(historicalRate, 0.1)
   *
   * Topics with acceleration > 2.0 are flagged as emerging.
   */
  private computeEmergingInterests(
    signals: CuriositySignal[],
    now: Date
  ): EmergingInterest[] {
    if (signals.length === 0) return [];

    const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const historicalStart = new Date(
      now.getTime() - (RECENT_WINDOW_DAYS + HISTORICAL_WINDOW_DAYS) * 24 * 60 * 60 * 1000
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Group signals by topic
    const topicSignals = new Map<string, CuriositySignal[]>();
    for (const s of signals) {
      const group = topicSignals.get(s.topicId) ?? [];
      group.push(s);
      topicSignals.set(s.topicId, group);
    }

    const emerging: EmergingInterest[] = [];
    const topicEntries = Array.from(topicSignals.entries());

    for (let ti = 0; ti < topicEntries.length; ti++) {
      const topicId = topicEntries[ti][0];
      const topicSigs = topicEntries[ti][1];

      // Count signals in recent window (last 3 days)
      const recentCount = topicSigs.filter((s) => s.recordedAt >= recentCutoff).length;
      const recentRate = recentCount / RECENT_WINDOW_DAYS;

      // Count signals in historical window (days 4-6)
      const historicalCount = topicSigs.filter(
        (s) => s.recordedAt >= historicalStart && s.recordedAt < recentCutoff
      ).length;
      const historicalRate = historicalCount / HISTORICAL_WINDOW_DAYS;

      // Calculate acceleration
      const acceleration = recentRate / Math.max(historicalRate, 0.1);

      if (acceleration > EMERGING_ACCELERATION_THRESHOLD) {
        // Build daily signal trend for last 7 days
        const signalTrend: number[] = [];
        for (let d = 6; d >= 0; d--) {
          const dayStart = new Date(now.getTime() - (d + 1) * 24 * 60 * 60 * 1000);
          const dayEnd = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
          const dayCount = topicSigs.filter(
            (s) => s.recordedAt >= dayStart && s.recordedAt < dayEnd
          ).length;
          signalTrend.push(dayCount);
        }

        // Confidence based on signal volume (more signals = higher confidence)
        const totalRecent = topicSigs.filter((s) => s.recordedAt >= sevenDaysAgo).length;
        const confidence = Math.min(1, totalRecent / 10);

        // First seen: earliest signal for this topic
        const sorted = [...topicSigs].sort(
          (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
        );
        const firstSignal = sorted[0];
        const latestSignal = sorted[sorted.length - 1];

        emerging.push({
          topicId,
          topicName: latestSignal.topicName,
          domain: latestSignal.domain,
          acceleration: Math.round(acceleration * 100) / 100,
          signalTrend,
          confidence: Math.round(confidence * 1000) / 1000,
          firstSeenAt: firstSignal.recordedAt,
          detectedAt: now,
        });
      }
    }

    // Sort by acceleration descending
    emerging.sort((a, b) => b.acceleration - a.acceleration);
    return emerging;
  }

  /**
   * Check if the profile cache is stale and trigger an async refresh.
   */
  private async maybeRefreshProfileCache(
    tenantId: string,
    learnerId: string
  ): Promise<void> {
    const cached = await prisma.curiosityProfileCache.findUnique({
      where: { learnerId },
    });

    if (!cached) {
      // No cache exists -- trigger a refresh
      await this.refreshProfileCache(tenantId, learnerId);
      return;
    }

    const age = Date.now() - cached.lastUpdated.getTime();
    if (age > PROFILE_CACHE_TTL_MS) {
      await this.refreshProfileCache(tenantId, learnerId);
    }
  }

  /**
   * Recompute the full profile and persist to the cache table.
   */
  private async refreshProfileCache(
    tenantId: string,
    learnerId: string
  ): Promise<void> {
    try {
      const profile = await this.computeProfile(tenantId, learnerId);
      await this.persistProfileCache(tenantId, learnerId, profile);
      log.debug('Profile cache refreshed', { tenantId, learnerId });
    } catch (error) {
      log.error('Failed to refresh profile cache', error as Error, {
        tenantId,
        learnerId,
      });
    }
  }

  /**
   * Persist a computed profile to the CuriosityProfileCache table.
   */
  private async persistProfileCache(
    tenantId: string,
    learnerId: string,
    profile: CuriosityProfile
  ): Promise<void> {
    await prisma.curiosityProfileCache.upsert({
      where: { learnerId },
      update: {
        tenantId,
        overallScore: profile.overallScore,
        signalCount: profile.components.signalCount,
        breadthScore: profile.components.breadth,
        depthScore: profile.components.depth,
        questionFrequency: profile.components.questionFrequency,
        explorationRate: profile.components.explorationRate,
        clusters: profile.clusters as unknown as Record<string, unknown>[],
        emergingInterests: profile.emergingInterests as unknown as Record<string, unknown>[],
        lastUpdated: profile.lastUpdated,
      },
      create: {
        tenantId,
        learnerId,
        overallScore: profile.overallScore,
        signalCount: profile.components.signalCount,
        breadthScore: profile.components.breadth,
        depthScore: profile.components.depth,
        questionFrequency: profile.components.questionFrequency,
        explorationRate: profile.components.explorationRate,
        clusters: profile.clusters as unknown as Record<string, unknown>[],
        emergingInterests: profile.emergingInterests as unknown as Record<string, unknown>[],
        lastUpdated: profile.lastUpdated,
      },
    });
  }

  /**
   * Convert a CuriosityProfileCache DB record back to a CuriosityProfile.
   */
  private cacheToProfile(
    cached: {
      overallScore: number;
      signalCount: number;
      breadthScore: number;
      depthScore: number;
      questionFrequency: number;
      explorationRate: number;
      clusters: unknown;
      emergingInterests: unknown;
      lastUpdated: Date;
    },
    learnerId: string
  ): CuriosityProfile {
    return {
      learnerId,
      overallScore: cached.overallScore,
      components: {
        signalCount: cached.signalCount,
        breadth: cached.breadthScore,
        depth: cached.depthScore,
        questionFrequency: cached.questionFrequency,
        explorationRate: cached.explorationRate,
      },
      clusters: (cached.clusters ?? []) as unknown as InterestCluster[],
      emergingInterests: (cached.emergingInterests ?? []) as unknown as EmergingInterest[],
      recentSignals: [], // Not stored in cache; caller should fetch if needed
      lastUpdated: cached.lastUpdated,
    };
  }

  /**
   * Build a human-readable reasoning string for a content suggestion.
   */
  private buildSuggestionReasoning(
    curiosityAlignment: number,
    peerPopularity: number,
    crossCurricular: boolean,
    topicNames: string[]
  ): string {
    const parts: string[] = [];

    if (curiosityAlignment > 0.7) {
      parts.push('strongly aligned with your current interests');
    } else if (curiosityAlignment > 0.3) {
      parts.push('partially aligned with your interests');
    } else {
      parts.push('explores new territory beyond your current interests');
    }

    if (peerPopularity > 0.7) {
      parts.push('highly popular among similar learners');
    } else if (peerPopularity > 0.3) {
      parts.push('moderately popular among peers');
    }

    if (crossCurricular) {
      parts.push('spans multiple subject areas');
    }

    if (topicNames.length > 0) {
      parts.push(`covers ${topicNames.slice(0, 2).join(' and ')}`);
    }

    return parts.join('; ') + '.';
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: CuriosityEngineService | null = null;

/**
 * Initialize the CuriosityEngineService singleton.
 * Call this once during application startup.
 */
export function initializeCuriosityEngineService(): CuriosityEngineService {
  if (!instance) {
    instance = new CuriosityEngineService();
    log.info('CuriosityEngineService initialized');
  }
  return instance;
}

/**
 * Get the CuriosityEngineService singleton.
 * Throws if the service has not been initialized.
 */
export function getCuriosityEngineService(): CuriosityEngineService {
  if (!instance) {
    throw new Error(
      'CuriosityEngineService has not been initialized. Call initializeCuriosityEngineService() first.'
    );
  }
  return instance;
}
