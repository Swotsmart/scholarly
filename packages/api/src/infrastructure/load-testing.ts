// ============================================================================
// SCHOLARLY PLATFORM — Sprint 17, Deliverable S17-002
// Load Testing & Capacity Planning
// ============================================================================
// Validates that the platform can handle 1,000+ concurrent learners by
// simulating realistic usage patterns across all critical paths. Uses the
// P95 targets defined in S16-002 as success criteria.
//
// Think of this as a dress rehearsal with a full audience before opening
// night — we're not testing whether the actors know their lines (that's
// unit testing), we're testing whether the theatre can handle a full
// house without the lights flickering or the sound cutting out.
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Load Test Configuration & Scenarios
// ==========================================================================

export interface PerformanceTargets {
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly maxErrorRate: number;
  readonly minThroughputRps: number;
}

export const CRITICAL_PATH_TARGETS: Record<string, PerformanceTargets> = {
  'story-generation':       { p50Ms: 3000, p95Ms: 8000, p99Ms: 15000, maxErrorRate: 0.02, minThroughputRps: 10 },
  'library-search':         { p50Ms: 80,   p95Ms: 200,  p99Ms: 500,   maxErrorRate: 0.01, minThroughputRps: 200 },
  'library-recommend':      { p50Ms: 120,  p95Ms: 300,  p99Ms: 800,   maxErrorRate: 0.01, minThroughputRps: 150 },
  'reader-page-load':       { p50Ms: 50,   p95Ms: 150,  p99Ms: 300,   maxErrorRate: 0.005, minThroughputRps: 500 },
  'bkt-mastery-update':     { p50Ms: 30,   p95Ms: 100,  p99Ms: 200,   maxErrorRate: 0.01, minThroughputRps: 300 },
  'audio-narration-stream': { p50Ms: 200,  p95Ms: 500,  p99Ms: 1000,  maxErrorRate: 0.02, minThroughputRps: 100 },
  'asr-speech-recognition': { p50Ms: 500,  p95Ms: 1500, p99Ms: 3000,  maxErrorRate: 0.03, minThroughputRps: 50 },
  'gradebook-update':       { p50Ms: 40,   p95Ms: 120,  p99Ms: 250,   maxErrorRate: 0.01, minThroughputRps: 200 },
  'auth-token-refresh':     { p50Ms: 20,   p95Ms: 60,   p99Ms: 150,   maxErrorRate: 0.005, minThroughputRps: 500 },
  'websocket-connect':      { p50Ms: 100,  p95Ms: 300,  p99Ms: 600,   maxErrorRate: 0.02, minThroughputRps: 100 },
};

/** Simulated learner behaviour profiles for realistic load patterns */
export interface LearnerProfile {
  readonly id: string;
  readonly type: 'active-reader' | 'casual-browser' | 'assessment-taker' | 'power-user';
  readonly actionsPerMinute: number;
  readonly sessionDurationMinutes: number;
  readonly actionDistribution: Record<string, number>;  // Action type → probability (0-1)
}

export const LEARNER_PROFILES: LearnerProfile[] = [
  {
    id: 'active-reader', type: 'active-reader', actionsPerMinute: 4, sessionDurationMinutes: 20,
    actionDistribution: {
      'reader-page-load': 0.40, 'audio-narration-stream': 0.25, 'asr-speech-recognition': 0.15,
      'bkt-mastery-update': 0.10, 'library-search': 0.05, 'library-recommend': 0.05,
    },
  },
  {
    id: 'casual-browser', type: 'casual-browser', actionsPerMinute: 2, sessionDurationMinutes: 10,
    actionDistribution: {
      'library-search': 0.35, 'library-recommend': 0.30, 'reader-page-load': 0.20,
      'audio-narration-stream': 0.10, 'bkt-mastery-update': 0.05,
    },
  },
  {
    id: 'assessment-taker', type: 'assessment-taker', actionsPerMinute: 3, sessionDurationMinutes: 15,
    actionDistribution: {
      'asr-speech-recognition': 0.35, 'bkt-mastery-update': 0.25, 'reader-page-load': 0.20,
      'gradebook-update': 0.15, 'library-recommend': 0.05,
    },
  },
  {
    id: 'power-user', type: 'power-user', actionsPerMinute: 6, sessionDurationMinutes: 30,
    actionDistribution: {
      'reader-page-load': 0.25, 'library-search': 0.15, 'library-recommend': 0.10,
      'audio-narration-stream': 0.15, 'asr-speech-recognition': 0.15, 'bkt-mastery-update': 0.10,
      'gradebook-update': 0.05, 'story-generation': 0.05,
    },
  },
];

/** Load test scenario configuration */
export interface LoadTestScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly concurrentUsers: number;
  readonly rampUpSeconds: number;       // Time to reach full concurrency
  readonly sustainSeconds: number;       // Time at full concurrency
  readonly rampDownSeconds: number;      // Time to wind down
  readonly profileDistribution: Record<string, number>;  // Profile type → percentage
}

export const LOAD_SCENARIOS: LoadTestScenario[] = [
  {
    id: 'smoke', name: 'Smoke Test', description: 'Basic sanity check with minimal load',
    concurrentUsers: 10, rampUpSeconds: 5, sustainSeconds: 60, rampDownSeconds: 5,
    profileDistribution: { 'active-reader': 0.5, 'casual-browser': 0.3, 'assessment-taker': 0.2 },
  },
  {
    id: 'normal', name: 'Normal Load', description: 'Typical school day usage pattern — 100 concurrent learners',
    concurrentUsers: 100, rampUpSeconds: 30, sustainSeconds: 300, rampDownSeconds: 30,
    profileDistribution: { 'active-reader': 0.4, 'casual-browser': 0.25, 'assessment-taker': 0.25, 'power-user': 0.1 },
  },
  {
    id: 'peak', name: 'Peak Load', description: 'Peak usage — multiple schools in morning reading time',
    concurrentUsers: 500, rampUpSeconds: 60, sustainSeconds: 600, rampDownSeconds: 60,
    profileDistribution: { 'active-reader': 0.45, 'casual-browser': 0.20, 'assessment-taker': 0.30, 'power-user': 0.05 },
  },
  {
    id: 'stress', name: 'Stress Test', description: 'Beyond expected capacity — 1,000+ concurrent learners',
    concurrentUsers: 1200, rampUpSeconds: 120, sustainSeconds: 900, rampDownSeconds: 120,
    profileDistribution: { 'active-reader': 0.40, 'casual-browser': 0.25, 'assessment-taker': 0.25, 'power-user': 0.10 },
  },
  {
    id: 'spike', name: 'Spike Test', description: 'Sudden traffic spike — simulates viral moment or event',
    concurrentUsers: 2000, rampUpSeconds: 10, sustainSeconds: 180, rampDownSeconds: 30,
    profileDistribution: { 'casual-browser': 0.60, 'active-reader': 0.30, 'assessment-taker': 0.10 },
  },
  {
    id: 'endurance', name: 'Endurance Test', description: 'Extended moderate load — memory leak detection',
    concurrentUsers: 200, rampUpSeconds: 30, sustainSeconds: 3600, rampDownSeconds: 30,
    profileDistribution: { 'active-reader': 0.35, 'casual-browser': 0.30, 'assessment-taker': 0.25, 'power-user': 0.10 },
  },
];

// ==========================================================================
// Section 2: Virtual User Engine
// ==========================================================================
// Each virtual user simulates a real learner's session — logging in,
// browsing the library, reading storybooks, completing assessments.
// The engine manages user lifecycle (ramp up, sustain, ramp down)
// and collects per-request timing data for analysis.

export interface RequestResult {
  readonly userId: string;
  readonly action: string;
  readonly startedAt: number;      // Epoch ms
  readonly durationMs: number;
  readonly statusCode: number;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly responseSize: number;   // Bytes
}

export class VirtualUserEngine extends ScholarlyBaseService {
  private activeUsers: Map<string, VirtualUser> = new Map();
  private results: RequestResult[] = [];
  private isRunning = false;

  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string,
  ) { super('VirtualUserEngine'); }

  /**
   * Execute a load test scenario with virtual users.
   * Manages the full lifecycle: ramp up → sustain → ramp down.
   */
  async executeScenario(scenario: LoadTestScenario): Promise<Result<RequestResult[]>> {
    this.isRunning = true;
    this.results = [];
    this.activeUsers.clear();

    this.log('info', `Starting scenario: ${scenario.name}`, {
      concurrentUsers: scenario.concurrentUsers,
      totalDuration: scenario.rampUpSeconds + scenario.sustainSeconds + scenario.rampDownSeconds,
    });

    // Phase 1: Ramp up
    await this.rampUp(scenario);

    // Phase 2: Sustain
    await this.sustain(scenario);

    // Phase 3: Ramp down
    await this.rampDown(scenario);

    this.isRunning = false;

    this.log('info', `Scenario complete: ${scenario.name}`, {
      totalRequests: this.results.length,
      totalUsers: scenario.concurrentUsers,
    });

    return ok([...this.results]);
  }

  /** Gradually add virtual users over the ramp-up period */
  private async rampUp(scenario: LoadTestScenario): Promise<void> {
    const usersPerSecond = scenario.concurrentUsers / scenario.rampUpSeconds;
    let usersAdded = 0;

    for (let second = 0; second < scenario.rampUpSeconds && this.isRunning; second++) {
      const targetUsers = Math.min(
        Math.floor((second + 1) * usersPerSecond),
        scenario.concurrentUsers
      );

      while (usersAdded < targetUsers) {
        const profile = this.selectProfile(scenario.profileDistribution);
        const user = new VirtualUser(
          `vu-${usersAdded + 1}`,
          profile,
          this.baseUrl,
          this.authToken,
          (result) => this.results.push(result),
        );
        this.activeUsers.set(user.id, user);
        user.start();
        usersAdded++;
      }

      await this.delay(1000);
    }

    this.log('info', `Ramp-up complete: ${usersAdded} users active`);
  }

  /** Maintain steady-state load for the sustain period */
  private async sustain(scenario: LoadTestScenario): Promise<void> {
    const checkIntervalMs = 5000;
    let elapsed = 0;

    while (elapsed < scenario.sustainSeconds * 1000 && this.isRunning) {
      // Monitor for crashed users and replace them
      for (const [id, user] of this.activeUsers) {
        if (!user.isActive) {
          const profile = this.selectProfile(scenario.profileDistribution);
          const replacement = new VirtualUser(
            id, profile, this.baseUrl, this.authToken,
            (result) => this.results.push(result),
          );
          this.activeUsers.set(id, replacement);
          replacement.start();
        }
      }

      await this.delay(checkIntervalMs);
      elapsed += checkIntervalMs;

      // Log progress every 30 seconds
      if (elapsed % 30000 === 0) {
        const recentResults = this.results.filter(r => r.startedAt > Date.now() - 30000);
        this.log('info', 'Sustain phase progress', {
          elapsed: `${elapsed / 1000}s`,
          activeUsers: this.activeUsers.size,
          recentRequests: recentResults.length,
          recentErrors: recentResults.filter(r => !r.success).length,
        });
      }
    }
  }

  /** Gradually remove virtual users over the ramp-down period */
  private async rampDown(scenario: LoadTestScenario): Promise<void> {
    const usersPerSecond = this.activeUsers.size / scenario.rampDownSeconds;
    const userIds = Array.from(this.activeUsers.keys());
    let usersRemoved = 0;

    for (let second = 0; second < scenario.rampDownSeconds && this.isRunning; second++) {
      const targetRemovals = Math.min(
        Math.floor((second + 1) * usersPerSecond),
        userIds.length
      );

      while (usersRemoved < targetRemovals && usersRemoved < userIds.length) {
        const id = userIds[usersRemoved];
        const user = this.activeUsers.get(id);
        if (user) {
          user.stop();
          this.activeUsers.delete(id);
        }
        usersRemoved++;
      }

      await this.delay(1000);
    }

    // Force stop any remaining users
    for (const [, user] of this.activeUsers) {
      user.stop();
    }
    this.activeUsers.clear();
  }

  /** Select a learner profile based on the scenario's distribution */
  private selectProfile(distribution: Record<string, number>): LearnerProfile {
    const rand = Math.random();
    let cumulative = 0;
    for (const [profileType, probability] of Object.entries(distribution)) {
      cumulative += probability;
      if (rand <= cumulative) {
        return LEARNER_PROFILES.find(p => p.id === profileType) || LEARNER_PROFILES[0];
      }
    }
    return LEARNER_PROFILES[0];
  }

  /** Cancel a running scenario */
  stop(): void {
    this.isRunning = false;
    for (const [, user] of this.activeUsers) {
      user.stop();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/** Individual virtual user that simulates learner behaviour */
class VirtualUser {
  readonly id: string;
  private running = false;
  private _isActive = false;
  get isActive(): boolean { return this._isActive; }

  constructor(
    id: string,
    private readonly profile: LearnerProfile,
    private readonly baseUrl: string,
    private readonly authToken: string,
    private readonly onResult: (result: RequestResult) => void,
  ) {
    this.id = id;
  }

  start(): void {
    this.running = true;
    this._isActive = true;
    this.runLoop().catch(() => { this._isActive = false; });
  }

  stop(): void {
    this.running = false;
    this._isActive = false;
  }

  private async runLoop(): Promise<void> {
    const delayBetweenActions = (60 / this.profile.actionsPerMinute) * 1000;
    const sessionEnd = Date.now() + this.profile.sessionDurationMinutes * 60 * 1000;

    while (this.running && Date.now() < sessionEnd) {
      const action = this.selectAction();
      const result = await this.executeAction(action);
      this.onResult(result);

      // Add realistic think time with jitter
      const jitter = (Math.random() - 0.5) * delayBetweenActions * 0.4;
      await new Promise(r => setTimeout(r, delayBetweenActions + jitter));
    }

    this._isActive = false;
  }

  /** Select next action based on profile's action distribution */
  private selectAction(): string {
    const rand = Math.random();
    let cumulative = 0;
    for (const [action, probability] of Object.entries(this.profile.actionDistribution)) {
      cumulative += probability;
      if (rand <= cumulative) return action;
    }
    return 'reader-page-load';
  }

  /** Execute a simulated API request and measure timing */
  private async executeAction(action: string): Promise<RequestResult> {
    const endpoint = ACTION_ENDPOINTS[action];
    const startedAt = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-Virtual-User': this.id,
        },
        body: endpoint.method === 'POST' ? JSON.stringify(endpoint.sampleBody) : undefined,
      });

      const durationMs = Date.now() - startedAt;
      const responseText = await response.text();

      return {
        userId: this.id,
        action,
        startedAt,
        durationMs,
        statusCode: response.status,
        success: response.ok,
        responseSize: responseText.length,
        errorMessage: response.ok ? undefined : responseText.substring(0, 200),
      };
    } catch (error) {
      return {
        userId: this.id,
        action,
        startedAt,
        durationMs: Date.now() - startedAt,
        statusCode: 0,
        success: false,
        responseSize: 0,
        errorMessage: `${error}`,
      };
    }
  }
}

/** API endpoint definitions for each action type */
const ACTION_ENDPOINTS: Record<string, { method: string; path: string; sampleBody?: any }> = {
  'story-generation':       { method: 'POST', path: '/api/v1/stories/generate', sampleBody: { phase: 3, theme: 'farm-animals', ageGroup: '5-7' } },
  'library-search':         { method: 'GET', path: '/api/v1/library/search?phase=3&theme=animals&limit=10' },
  'library-recommend':      { method: 'GET', path: '/api/v1/library/recommend?learnerId=test-learner' },
  'reader-page-load':       { method: 'GET', path: '/api/v1/stories/seed-0001/pages/1' },
  'bkt-mastery-update':     { method: 'POST', path: '/api/v1/phonics/mastery/update', sampleBody: { learnerId: 'test', gpc: 'sh', correct: true } },
  'audio-narration-stream': { method: 'GET', path: '/api/v1/stories/seed-0001/narrate/1' },
  'asr-speech-recognition': { method: 'POST', path: '/api/v1/phonics/asr/recognize', sampleBody: { audioBase64: 'dGVzdA==', expectedText: 'the cat sat' } },
  'gradebook-update':       { method: 'POST', path: '/api/v1/gradebook/record', sampleBody: { learnerId: 'test', activityId: 'read-1', score: 85 } },
  'auth-token-refresh':     { method: 'POST', path: '/api/v1/auth/refresh', sampleBody: { refreshToken: 'test-refresh' } },
  'websocket-connect':      { method: 'GET', path: '/api/v1/ws/health' },
};

// ==========================================================================
// Section 3: Results Analyser — Turning Raw Data into Insight
// ==========================================================================

export interface PercentileResult {
  readonly p50: number;
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly stdDev: number;
}

export interface ActionAnalysis {
  readonly action: string;
  readonly totalRequests: number;
  readonly successCount: number;
  readonly errorCount: number;
  readonly errorRate: number;
  readonly throughputRps: number;
  readonly latency: PercentileResult;
  readonly target: PerformanceTargets;
  readonly meetsP50: boolean;
  readonly meetsP95: boolean;
  readonly meetsP99: boolean;
  readonly meetsErrorRate: boolean;
  readonly meetsThroughput: boolean;
  readonly overallPass: boolean;
}

export interface LoadTestReport {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly durationSeconds: number;
  readonly totalRequests: number;
  readonly totalErrors: number;
  readonly overallErrorRate: number;
  readonly overallThroughputRps: number;
  readonly actionAnalyses: ActionAnalysis[];
  readonly overallPass: boolean;
  readonly failedActions: string[];
  readonly capacityEstimate: CapacityEstimate;
  readonly recommendations: string[];
}

export interface CapacityEstimate {
  readonly maxConcurrentUsers: number;
  readonly bottleneckAction: string;
  readonly bottleneckReason: string;
  readonly safeCapacity: number;          // Users with 20% headroom
  readonly scalingRecommendations: string[];
}

export class LoadTestAnalyser extends ScholarlyBaseService {
  constructor() { super('LoadTestAnalyser'); }

  /**
   * Analyse raw request results into a comprehensive load test report.
   * Compares actual performance against S16-002's P95 targets.
   */
  analyse(
    scenario: LoadTestScenario,
    results: RequestResult[],
  ): LoadTestReport {
    const startedAt = new Date(Math.min(...results.map(r => r.startedAt)));
    const completedAt = new Date(Math.max(...results.map(r => r.startedAt + r.durationMs)));
    const durationSeconds = (completedAt.getTime() - startedAt.getTime()) / 1000;

    // Group results by action
    const actionGroups = new Map<string, RequestResult[]>();
    for (const result of results) {
      if (!actionGroups.has(result.action)) actionGroups.set(result.action, []);
      actionGroups.get(result.action)!.push(result);
    }

    // Analyse each action against its target
    const actionAnalyses: ActionAnalysis[] = [];
    for (const [action, actionResults] of actionGroups) {
      const target = CRITICAL_PATH_TARGETS[action];
      if (!target) continue;

      const analysis = this.analyseAction(action, actionResults, target, durationSeconds);
      actionAnalyses.push(analysis);
    }

    const totalErrors = results.filter(r => !r.success).length;
    const failedActions = actionAnalyses.filter(a => !a.overallPass).map(a => a.action);

    // Estimate capacity
    const capacityEstimate = this.estimateCapacity(actionAnalyses, scenario);

    // Generate recommendations
    const recommendations = this.generateRecommendations(actionAnalyses, scenario);

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startedAt,
      completedAt,
      durationSeconds,
      totalRequests: results.length,
      totalErrors,
      overallErrorRate: totalErrors / results.length,
      overallThroughputRps: results.length / durationSeconds,
      actionAnalyses,
      overallPass: failedActions.length === 0,
      failedActions,
      capacityEstimate,
      recommendations,
    };
  }

  /** Analyse a single action's performance against its target */
  private analyseAction(
    action: string,
    results: RequestResult[],
    target: PerformanceTargets,
    totalDurationSeconds: number,
  ): ActionAnalysis {
    const durations = results.map(r => r.durationMs).sort((a, b) => a - b);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    const latency = this.calculatePercentiles(durations);
    const errorRate = errorCount / results.length;
    const throughputRps = results.length / totalDurationSeconds;

    return {
      action,
      totalRequests: results.length,
      successCount,
      errorCount,
      errorRate,
      throughputRps,
      latency,
      target,
      meetsP50: latency.p50 <= target.p50Ms,
      meetsP95: latency.p95 <= target.p95Ms,
      meetsP99: latency.p99 <= target.p99Ms,
      meetsErrorRate: errorRate <= target.maxErrorRate,
      meetsThroughput: throughputRps >= target.minThroughputRps,
      overallPass: latency.p95 <= target.p95Ms && errorRate <= target.maxErrorRate,
    };
  }

  /** Calculate percentile statistics from sorted duration array */
  private calculatePercentiles(sorted: number[]): PercentileResult {
    if (sorted.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, mean: 0, stdDev: 0 };
    }

    const percentile = (p: number) => sorted[Math.ceil(sorted.length * p / 100) - 1] || 0;
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const variance = sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / sorted.length;

    return {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: Math.round(mean),
      stdDev: Math.round(Math.sqrt(variance)),
    };
  }

  /** Estimate maximum capacity based on performance data */
  private estimateCapacity(
    analyses: ActionAnalysis[],
    scenario: LoadTestScenario,
  ): CapacityEstimate {
    // Find the bottleneck — the action closest to its limit
    let worstRatio = 0;
    let bottleneck = analyses[0];

    for (const analysis of analyses) {
      const latencyRatio = analysis.latency.p95 / analysis.target.p95Ms;
      if (latencyRatio > worstRatio) {
        worstRatio = latencyRatio;
        bottleneck = analysis;
      }
    }

    // Extrapolate: if we're at X% of limit with N users, max is ~N/X
    const maxUsers = worstRatio > 0
      ? Math.floor(scenario.concurrentUsers / worstRatio)
      : scenario.concurrentUsers * 2;

    const safeCapacity = Math.floor(maxUsers * 0.8);  // 20% headroom

    const scalingRecommendations: string[] = [];
    if (bottleneck.latency.p95 > bottleneck.target.p95Ms * 0.7) {
      scalingRecommendations.push(`Consider horizontal scaling for ${bottleneck.action}: P95 at ${(worstRatio * 100).toFixed(0)}% of target`);
    }
    if (bottleneck.errorRate > bottleneck.target.maxErrorRate * 0.5) {
      scalingRecommendations.push(`Error rate for ${bottleneck.action} approaching limit: ${(bottleneck.errorRate * 100).toFixed(1)}%`);
    }

    // Cache effectiveness recommendations
    for (const analysis of analyses) {
      if (['library-search', 'library-recommend', 'reader-page-load'].includes(analysis.action)) {
        if (analysis.latency.p95 > analysis.target.p95Ms * 0.5) {
          scalingRecommendations.push(`Verify Redis cache hit rate for ${analysis.action} — consider cache warming`);
        }
      }
    }

    return {
      maxConcurrentUsers: maxUsers,
      bottleneckAction: bottleneck.action,
      bottleneckReason: `P95 latency at ${(worstRatio * 100).toFixed(0)}% of ${bottleneck.target.p95Ms}ms target`,
      safeCapacity,
      scalingRecommendations,
    };
  }

  /** Generate actionable recommendations from load test results */
  private generateRecommendations(
    analyses: ActionAnalysis[],
    scenario: LoadTestScenario,
  ): string[] {
    const recs: string[] = [];

    for (const analysis of analyses) {
      if (!analysis.meetsP95) {
        recs.push(`CRITICAL: ${analysis.action} P95 (${analysis.latency.p95}ms) exceeds target (${analysis.target.p95Ms}ms). Investigate query optimisation or caching.`);
      }
      if (!analysis.meetsErrorRate) {
        recs.push(`CRITICAL: ${analysis.action} error rate (${(analysis.errorRate * 100).toFixed(1)}%) exceeds ${(analysis.target.maxErrorRate * 100).toFixed(1)}% target.`);
      }
      if (analysis.latency.stdDev > analysis.latency.mean) {
        recs.push(`WARNING: ${analysis.action} has high latency variance (stdDev: ${analysis.latency.stdDev}ms > mean: ${analysis.latency.mean}ms). Investigate GC pauses or connection pooling.`);
      }
      if (analysis.latency.p99 > analysis.target.p99Ms) {
        recs.push(`WARNING: ${analysis.action} P99 tail latency (${analysis.latency.p99}ms) exceeds ${analysis.target.p99Ms}ms. Consider circuit breaker or timeout tuning.`);
      }
    }

    // General infrastructure recommendations
    if (scenario.concurrentUsers >= 1000) {
      recs.push('SCALING: At 1,000+ users, consider connection pooling for PostgreSQL (pgBouncer) and Redis cluster mode.');
      recs.push('SCALING: Verify NATS cluster configuration supports projected event throughput.');
    }

    return recs;
  }
}

// ==========================================================================
// Section 4: Load Test Orchestrator — The Test Runner
// ==========================================================================

export class LoadTestOrchestrator extends ScholarlyBaseService {
  private readonly engine: VirtualUserEngine;
  private readonly analyser: LoadTestAnalyser;

  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string,
  ) {
    super('LoadTestOrchestrator');
    this.engine = new VirtualUserEngine(baseUrl, authToken);
    this.analyser = new LoadTestAnalyser();
  }

  /**
   * Run a complete load test suite — all scenarios in sequence.
   * Returns individual reports for each scenario plus an overall assessment.
   */
  async runFullSuite(): Promise<Result<LoadTestSuiteReport>> {
    const reports: LoadTestReport[] = [];

    for (const scenario of LOAD_SCENARIOS) {
      this.log('info', `Running scenario: ${scenario.name}`);

      const results = await this.engine.executeScenario(scenario);
      if (!results.success) {
        this.log('error', `Scenario ${scenario.name} failed: ${results.error}`);
        continue;
      }

      const report = this.analyser.analyse(scenario, results.data);
      reports.push(report);

      this.log('info', `Scenario ${scenario.name} complete`, {
        pass: report.overallPass,
        requests: report.totalRequests,
        errorRate: `${(report.overallErrorRate * 100).toFixed(2)}%`,
        throughput: `${report.overallThroughputRps.toFixed(1)} rps`,
      });

      // Cool-down between scenarios
      await new Promise(r => setTimeout(r, 10000));
    }

    const suiteReport: LoadTestSuiteReport = {
      runAt: new Date(),
      totalScenarios: reports.length,
      passedScenarios: reports.filter(r => r.overallPass).length,
      failedScenarios: reports.filter(r => !r.overallPass).length,
      reports,
      overallCapacity: this.calculateOverallCapacity(reports),
      productionReady: reports.filter(r =>
        ['normal', 'peak'].includes(r.scenarioId)
      ).every(r => r.overallPass),
    };

    return ok(suiteReport);
  }

  /** Run a single named scenario */
  async runScenario(scenarioId: string): Promise<Result<LoadTestReport>> {
    const scenario = LOAD_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return fail(`Unknown scenario: ${scenarioId}`);

    const results = await this.engine.executeScenario(scenario);
    if (!results.success) return fail(results.error);

    return ok(this.analyser.analyse(scenario, results.data));
  }

  private calculateOverallCapacity(reports: LoadTestReport[]): number {
    if (reports.length === 0) return 0;
    return Math.min(...reports.map(r => r.capacityEstimate.safeCapacity));
  }
}

export interface LoadTestSuiteReport {
  readonly runAt: Date;
  readonly totalScenarios: number;
  readonly passedScenarios: number;
  readonly failedScenarios: number;
  readonly reports: LoadTestReport[];
  readonly overallCapacity: number;
  readonly productionReady: boolean;
}
