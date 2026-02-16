'use strict';

// =============================================================================
// PUSH EXPIRY HANDLER
// =============================================================================
// A scheduled job that transitions expired pushes from 'active' to
// 'expired'. Think of it as the janitor who walks past the bulletin
// board every 15 minutes and takes down notices whose "remove after"
// date has passed. The notice isn't destroyed — it goes into the
// filing cabinet (audit trail) — but it's no longer on the board.
//
// Specification references:
//   Section 5.1  — "Pushes have an optional expiry. After expiry,
//                    the item transitions to ACTIVE."
//   Section 15   — "Optional expiry — Can expire after a date,
//                    transitioning to ACTIVE with normal lifecycle."
//   Phase 5 plan — "Push expiry handler: 0.5 day — Server-side job
//                    that transitions expired pushes from PUSHED to ACTIVE"
//
// This handler is designed to be run by a cron scheduler (e.g., node-cron,
// BullMQ repeatable job, or Kubernetes CronJob) at regular intervals.
// The recommended interval is every 15 minutes, balancing promptness
// against unnecessary database queries.
//
// Architecture:
//   - Stateless: each run is independent. Safe to run concurrently
//     (the service handles idempotency).
//   - Observable: emits structured logs and metrics for monitoring.
//   - Resilient: catches and reports errors without crashing the
//     scheduler process.
// =============================================================================

import { AdminPushService } from './admin-push.service';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the expiry handler.
 */
export interface ExpiryHandlerConfig {
  /**
   * How often to check for expired pushes, in milliseconds.
   * Default: 900,000 (15 minutes).
   */
  intervalMs: number;

  /**
   * Whether to run an immediate check on start.
   * Default: true.
   */
  runOnStart: boolean;

  /**
   * Maximum consecutive errors before the handler stops retrying
   * and requires manual restart.
   * Default: 5.
   */
  maxConsecutiveErrors: number;
}

/**
 * The result of a single expiry check run.
 */
export interface ExpiryRunResult {
  /** When this run started. */
  startedAt: string;

  /** When this run completed. */
  completedAt: string;

  /** How many pushes were expired in this run. */
  expiredCount: number;

  /** The task refs of expired pushes (for logging). */
  expiredRefs: string[];

  /** Whether the run succeeded. */
  success: boolean;

  /** Error message if the run failed. */
  error?: string;
}

/**
 * Structured log entry for monitoring and observability.
 */
export interface ExpiryLogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Logger interface. In production, this feeds into Prometheus/Grafana.
 * In tests, it collects entries for assertion.
 */
export interface ExpiryLogger {
  log(entry: ExpiryLogEntry): void;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: ExpiryHandlerConfig = {
  intervalMs: 15 * 60 * 1000, // 15 minutes
  runOnStart: true,
  maxConsecutiveErrors: 5,
};

// =============================================================================
// PUSH EXPIRY HANDLER
// =============================================================================

export class PushExpiryHandler {
  private readonly config: ExpiryHandlerConfig;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private consecutiveErrors = 0;
  private runHistory: ExpiryRunResult[] = [];
  private stopped = false;

  constructor(
    private readonly pushService: AdminPushService,
    private readonly logger: ExpiryLogger,
    config?: Partial<ExpiryHandlerConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── LIFECYCLE ────────────────────────────────────────────────────────

  /**
   * Start the expiry handler. Sets up the interval and optionally
   * runs an immediate check.
   */
  async start(): Promise<void> {
    if (this.intervalHandle !== null) {
      this.logger.log({
        level: 'warn',
        message: 'Push expiry handler already running. Ignoring start().',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.stopped = false;

    this.logger.log({
      level: 'info',
      message: `Push expiry handler starting. Interval: ${this.config.intervalMs}ms. Run on start: ${this.config.runOnStart}.`,
      data: { intervalMs: this.config.intervalMs },
      timestamp: new Date().toISOString(),
    });

    if (this.config.runOnStart) {
      await this.runOnce();
    }

    this.intervalHandle = setInterval(() => {
      this.runOnce().catch(err => {
        this.logger.log({
          level: 'error',
          message: `Unhandled error in expiry handler interval: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        });
      });
    }, this.config.intervalMs);
  }

  /**
   * Stop the expiry handler. Clears the interval but allows any
   * in-progress run to complete.
   */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.stopped = true;

    this.logger.log({
      level: 'info',
      message: 'Push expiry handler stopped.',
      timestamp: new Date().toISOString(),
    });
  }

  // ── SINGLE RUN ───────────────────────────────────────────────────────

  /**
   * Execute a single expiry check. Can be called manually for testing
   * or triggered by the interval.
   */
  async runOnce(): Promise<ExpiryRunResult> {
    if (this.isRunning) {
      const skipped: ExpiryRunResult = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        expiredCount: 0,
        expiredRefs: [],
        success: true,
        error: 'Skipped: previous run still in progress.',
      };
      return skipped;
    }

    if (this.stopped) {
      const stoppedResult: ExpiryRunResult = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        expiredCount: 0,
        expiredRefs: [],
        success: false,
        error: 'Handler is stopped.',
      };
      return stoppedResult;
    }

    this.isRunning = true;
    const startedAt = new Date().toISOString();

    try {
      const result = await this.pushService.processExpiredPushes();

      if (!result.success) {
        this.consecutiveErrors++;

        const errorResult: ExpiryRunResult = {
          startedAt,
          completedAt: new Date().toISOString(),
          expiredCount: 0,
          expiredRefs: [],
          success: false,
          error: result.error,
        };

        this.logger.log({
          level: 'error',
          message: `Expiry check failed: ${result.error}`,
          data: { consecutiveErrors: this.consecutiveErrors },
          timestamp: new Date().toISOString(),
        });

        this.runHistory.push(errorResult);
        this.checkErrorThreshold();

        return errorResult;
      }

      // Reset consecutive error counter on success
      this.consecutiveErrors = 0;

      const { expiredCount, expiredPushes } = result.data;
      const expiredRefs = expiredPushes.map(p => p.taskRef);

      if (expiredCount > 0) {
        this.logger.log({
          level: 'info',
          message: `Expired ${expiredCount} push(es): ${expiredRefs.join(', ')}.`,
          data: {
            expiredCount,
            expiredRefs,
            pushIds: expiredPushes.map(p => p.id),
          },
          timestamp: new Date().toISOString(),
        });
      }

      const successResult: ExpiryRunResult = {
        startedAt,
        completedAt: new Date().toISOString(),
        expiredCount,
        expiredRefs,
        success: true,
      };

      this.runHistory.push(successResult);

      // Keep only the last 100 run results to prevent memory growth
      if (this.runHistory.length > 100) {
        this.runHistory = this.runHistory.slice(-100);
      }

      return successResult;
    } catch (err) {
      this.consecutiveErrors++;

      const errorResult: ExpiryRunResult = {
        startedAt,
        completedAt: new Date().toISOString(),
        expiredCount: 0,
        expiredRefs: [],
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };

      this.logger.log({
        level: 'error',
        message: `Expiry handler threw: ${err instanceof Error ? err.message : String(err)}`,
        data: { consecutiveErrors: this.consecutiveErrors },
        timestamp: new Date().toISOString(),
      });

      this.runHistory.push(errorResult);
      this.checkErrorThreshold();

      return errorResult;
    } finally {
      this.isRunning = false;
    }
  }

  // ── ERROR THRESHOLD ──────────────────────────────────────────────────

  /**
   * If consecutive errors exceed the threshold, stop the handler
   * to prevent runaway error logging. Requires manual restart.
   */
  private checkErrorThreshold(): void {
    if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      this.logger.log({
        level: 'error',
        message: `Push expiry handler exceeded ${this.config.maxConsecutiveErrors} consecutive errors. Stopping. Manual restart required.`,
        data: { consecutiveErrors: this.consecutiveErrors },
        timestamp: new Date().toISOString(),
      });

      this.stop();
    }
  }

  // ── STATUS ───────────────────────────────────────────────────────────

  /**
   * Returns the handler's current status for monitoring dashboards.
   */
  getStatus(): {
    running: boolean;
    stopped: boolean;
    consecutiveErrors: number;
    totalRuns: number;
    lastRun: ExpiryRunResult | null;
    totalExpired: number;
  } {
    const lastRun = this.runHistory.length > 0
      ? this.runHistory[this.runHistory.length - 1]!
      : null;

    const totalExpired = this.runHistory.reduce(
      (sum, r) => sum + r.expiredCount,
      0,
    );

    return {
      running: this.intervalHandle !== null && !this.stopped,
      stopped: this.stopped,
      consecutiveErrors: this.consecutiveErrors,
      totalRuns: this.runHistory.length,
      lastRun,
      totalExpired,
    };
  }

  /**
   * Returns the full run history (last 100 runs).
   */
  getRunHistory(): ExpiryRunResult[] {
    return [...this.runHistory];
  }
}

// =============================================================================
// SIMPLE LOGGER (for testing and development)
// =============================================================================

export class InMemoryExpiryLogger implements ExpiryLogger {
  public entries: ExpiryLogEntry[] = [];

  log(entry: ExpiryLogEntry): void {
    this.entries.push(entry);
  }

  clear(): void {
    this.entries = [];
  }

  getByLevel(level: ExpiryLogEntry['level']): ExpiryLogEntry[] {
    return this.entries.filter(e => e.level === level);
  }
}
