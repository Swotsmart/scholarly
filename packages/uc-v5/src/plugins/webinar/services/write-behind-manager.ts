/**
 * Chekd Unified Communications 3.2 — Write-Behind Cache Manager
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE COURT STENOGRAPHER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Imagine a courtroom during a fast-paced trial. The proceedings happen in
 * real-time — witnesses speak, lawyers object, the judge rules. No one waits
 * for the court stenographer to finish typing before continuing. The transcript
 * is produced continuously in the background, and if the stenographer's
 * machine crashes mid-sentence, the printed pages already produced are safe.
 *
 * That is exactly what this module does for the webinar plugin's twelve
 * in-memory data stores. During a live broadcast with 2,000 participants
 * generating reactions, chat messages, poll votes, and Q&A submissions,
 * writing every event synchronously to the database would create unacceptable
 * latency on the hot path. But running purely in-memory is equally
 * unacceptable — a process crash during a 90-minute webinar with 1,800
 * attendees would lose every question, every poll vote, every chat message,
 * and every AI insight collected up to that point. The data is irreplaceable
 * and the event is unrepeatable.
 *
 * The WriteBehindManager solves this by maintaining a dual-write architecture:
 *
 *   • In-memory Maps remain the primary read/write surface (microsecond latency)
 *   • A background flush cycle serialises dirty stores to the database
 *     every 5 seconds (configurable)
 *   • Only stores that have actually changed since the last flush are written
 *   • High-velocity append-only stores (chat, reactions) use cursor-based
 *     incremental writes — not full-array serialisation
 *   • Analytical stores (sentiment, engagement timelines) flush on a relaxed
 *     schedule (every 3rd cycle = ~15s)
 *
 * The worst-case data loss window is one flush interval (5 seconds by default).
 * At peak load with 2,000 participants, that's approximately 250 chat messages
 * and 500 reactions — significant, but recoverable. The structural data
 * (webinar config, registrations, polls, questions) was flushed on the
 * previous cycle and is completely safe.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  DATA TIER CLASSIFICATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Not all stores are created equal. We classify them into three tiers:
 *
 * Tier 1 — Structural (every cycle):
 *   webinars, registrations, polls, questions, breakouts, ctas
 *   These change infrequently but are expensive to lose.
 *
 * Tier 2 — High-Velocity Append (every cycle, cursor-batched):
 *   chatMessages, reactions
 *   These receive 50-100 writes/sec during peaks. We only flush new records.
 *
 * Tier 3 — Analytical (every Nth cycle):
 *   participants, insights, sentimentHistory, engagementHistory
 *   These are AI-generated time-series data. Missing 1-2 snapshots is tolerable.
 */

import type { StorageAdapter } from '../../../core/plugin-interface';
import type { EventBus } from '../../../bus/event-bus';
import type { Logger } from '../../../utils/logger';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface WriteBehindConfig {
  /** Base flush interval in milliseconds (default: 5000 — 5 seconds) */
  flushIntervalMs: number;

  /** Tier 3 stores flush every Nth cycle (default: 3 — every 15s at 5s interval) */
  analyticsFlushMultiplier: number;

  /** Max consecutive flush failures before emitting persistence-degraded (default: 3) */
  maxRetries: number;

  /** Whether to perform a full flush on graceful shutdown (default: true) */
  flushOnShutdown: boolean;

  /** Whether to rehydrate from storage on initialisation (default: true) */
  rehydrateOnInit: boolean;

  /** Maximum age (ms) of stored data to accept during rehydration (default: 24h) */
  rehydrationMaxAgeMs: number;

  /** Emit flush metrics on the event bus (default: true) */
  emitMetrics: boolean;
}

export const DEFAULT_WRITE_BEHIND_CONFIG: WriteBehindConfig = {
  flushIntervalMs: 5000,
  analyticsFlushMultiplier: 3,
  maxRetries: 3,
  flushOnShutdown: true,
  rehydrateOnInit: true,
  rehydrationMaxAgeMs: 86_400_000,
  emitMetrics: true,
};

// ─── Flush Metrics ───────────────────────────────────────────────────────────

export interface FlushMetrics {
  webinarId: string;
  cycleNumber: number;
  durationMs: number;
  storesFlushed: string[];
  recordsWritten: number;
  errors: string[];
  timestamp: Date;
}

// ─── Append Cursor ───────────────────────────────────────────────────────────

interface AppendCursor {
  storeKey: string;
  lastFlushedIndex: number;
}

// ─── Store Registry Entry ────────────────────────────────────────────────────

interface StoreEntry {
  /** The collection name in the StorageAdapter */
  collection: string;
  /** 1 = structural, 2 = high-velocity append, 3 = analytical */
  tier: 1 | 2 | 3;
  /** Function that returns the serialisable data for a given webinar ID */
  serialise: (webinarId: string) => unknown;
  /** Function that restores data from a deserialised payload */
  deserialise: (webinarId: string, data: unknown) => void;
}

// ─── Rehydration Result ──────────────────────────────────────────────────────

export interface RehydrationResult {
  rehydrated: number;
  skipped: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THE WRITE-BEHIND MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export class WriteBehindManager {
  private storage: StorageAdapter;
  private logger: Logger;
  private bus: EventBus;
  private config: WriteBehindConfig;

  /** Tracks which store keys have been mutated since the last flush */
  private dirty: Set<string> = new Set();

  /** Append cursors for Tier 2 stores: key → last flushed index */
  private appendCursors: Map<string, AppendCursor> = new Map();

  /** Running cycle number per webinar (for Tier 3 multiplier logic) */
  private cycleCounters: Map<string, number> = new Map();

  /** Active flush interval timers per webinar */
  private flushTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  /** Consecutive failure count per webinar (for degraded detection) */
  private failureCounts: Map<string, number> = new Map();

  /** Whether persistence is in degraded state per webinar */
  private degradedState: Map<string, boolean> = new Map();

  /** Registry of all store entries (registered during init by the plugin) */
  private stores: Map<string, StoreEntry> = new Map();

  /** Tracks webinar IDs that have been persisted (for rehydration discovery) */
  private persistedWebinarIds: Set<string> = new Set();

  /** Flush lock per webinar to prevent overlapping flushes */
  private flushInProgress: Map<string, boolean> = new Map();

  constructor(
    storage: StorageAdapter,
    logger: Logger,
    bus: EventBus,
    config?: Partial<WriteBehindConfig>,
  ) {
    this.storage = storage;
    this.logger = logger;
    this.bus = bus;
    this.config = { ...DEFAULT_WRITE_BEHIND_CONFIG, ...config };
  }

  // ─── Store Registration ────────────────────────────────────────────────
  //
  // The plugin calls registerStore() during initialisation to teach the
  // manager how to serialise/deserialise each of its twelve Map stores.

  registerStore(name: string, entry: StoreEntry): void {
    this.stores.set(name, entry);
  }

  // ─── Dirty Tracking ────────────────────────────────────────────────────
  //
  // Called by the plugin at each mutation site. Think of it as the
  // stenographer's "new content" bell — one ding per change, no matter
  // how small. The actual transcription happens on the next flush cycle.

  markDirty(storeKey: string): void {
    this.dirty.add(storeKey);
  }

  isDirty(storeKey: string): boolean {
    return this.dirty.has(storeKey);
  }

  getDirtyCount(): number {
    return this.dirty.size;
  }

  // ─── Flush Lifecycle ───────────────────────────────────────────────────

  /**
   * Start the periodic flush cycle for a webinar.
   * Called when a broadcast starts (the courtroom session begins).
   */
  startFlushing(webinarId: string): void {
    if (this.flushTimers.has(webinarId)) {
      this.logger.warn(`Flush cycle already active for ${webinarId}`);
      return;
    }

    this.cycleCounters.set(webinarId, 0);
    this.failureCounts.set(webinarId, 0);
    this.degradedState.set(webinarId, false);
    this.flushInProgress.set(webinarId, false);

    const timer = setInterval(async () => {
      await this.executeFlushCycle(webinarId);
    }, this.config.flushIntervalMs);

    this.flushTimers.set(webinarId, timer);
    this.logger.info(`Write-behind flush cycle started for ${webinarId} (interval: ${this.config.flushIntervalMs}ms)`);
  }

  /**
   * Stop the flush cycle for a webinar (broadcast ended).
   * Does NOT perform a final flush — call finalFlush() for that.
   */
  stopFlushing(webinarId: string): void {
    const timer = this.flushTimers.get(webinarId);
    if (timer) {
      clearInterval(timer);
      this.flushTimers.delete(webinarId);
      this.logger.info(`Write-behind flush cycle stopped for ${webinarId}`);
    }
    this.cycleCounters.delete(webinarId);
    this.flushInProgress.delete(webinarId);
  }

  /**
   * Perform a final, comprehensive flush of ALL stores for a webinar.
   * Called on broadcast end and graceful shutdown. This is the stenographer
   * printing the final page — everything in memory is committed to paper.
   */
  async finalFlush(webinarId: string): Promise<FlushMetrics> {
    this.stopFlushing(webinarId);

    // Mark ALL stores as dirty to ensure a complete flush
    for (const [name] of this.stores) {
      this.dirty.add(`${name}:${webinarId}`);
    }

    const metrics = await this.executeFlushCycle(webinarId, true);
    this.logger.info(`Final flush completed for ${webinarId}: ${metrics.recordsWritten} records, ${metrics.durationMs}ms`);
    return metrics;
  }

  /**
   * Flush all active webinars on shutdown (the courthouse closing for the day).
   */
  async flushAll(): Promise<void> {
    if (!this.config.flushOnShutdown) return;

    const webinarIds = [...this.flushTimers.keys()];
    this.logger.info(`Flushing ${webinarIds.length} active webinars on shutdown...`);

    for (const id of webinarIds) {
      try {
        await this.finalFlush(id);
      } catch (err) {
        this.logger.error(`Shutdown flush failed for ${id}: ${err}`);
      }
    }
  }

  // ─── Core Flush Cycle ──────────────────────────────────────────────────

  private async executeFlushCycle(webinarId: string, isFinal = false): Promise<FlushMetrics> {
    // Prevent overlapping flushes
    if (this.flushInProgress.get(webinarId) && !isFinal) {
      return { webinarId, cycleNumber: -1, durationMs: 0, storesFlushed: [], recordsWritten: 0, errors: ['Skipped: flush in progress'], timestamp: new Date() };
    }

    this.flushInProgress.set(webinarId, true);
    const start = Date.now();
    const cycle = (this.cycleCounters.get(webinarId) || 0) + 1;
    this.cycleCounters.set(webinarId, cycle);

    const metrics: FlushMetrics = {
      webinarId,
      cycleNumber: cycle,
      durationMs: 0,
      storesFlushed: [],
      recordsWritten: 0,
      errors: [],
      timestamp: new Date(),
    };

    // Step 1: Snapshot the dirty set and clear it atomically.
    // New mutations during flush go into the NEXT cycle, not this one.
    const dirtySnapshot = new Set<string>();
    for (const key of this.dirty) {
      if (key.endsWith(`:${webinarId}`)) {
        dirtySnapshot.add(key);
      }
    }
    for (const key of dirtySnapshot) {
      this.dirty.delete(key);
    }

    if (dirtySnapshot.size === 0 && !isFinal) {
      this.flushInProgress.set(webinarId, false);
      return metrics;
    }

    // Step 2: Flush each dirty store, respecting tier rules
    const storeFlushPromises: { name: string; promise: () => Promise<number> }[] = [];

    for (const [name, entry] of this.stores) {
      const storeKey = `${name}:${webinarId}`;
      const isDirtyOrFinal = dirtySnapshot.has(storeKey) || isFinal;
      if (!isDirtyOrFinal) continue;

      // Tier 3 stores only flush on every Nth cycle (unless final)
      if (entry.tier === 3 && !isFinal && cycle % this.config.analyticsFlushMultiplier !== 0) {
        // Re-mark as dirty so it's picked up on the next qualifying cycle
        this.dirty.add(storeKey);
        continue;
      }

      storeFlushPromises.push({
        name,
        promise: async () => {
          if (entry.tier === 2) {
            return this.flushAppendStore(webinarId, name, entry);
          } else {
            return this.flushFullStore(webinarId, name, entry);
          }
        },
      });
    }

    // Step 3: Execute all flushes. We use a transaction wrapper to ensure
    // atomicity — either the entire flush succeeds or none of it does.
    try {
      await this.storage.transaction(async (tx) => {
        for (const { name, promise } of storeFlushPromises) {
          try {
            const count = await promise();
            metrics.storesFlushed.push(name);
            metrics.recordsWritten += count;
          } catch (err) {
            const errMsg = `Store ${name} flush error: ${err}`;
            metrics.errors.push(errMsg);
            // Re-mark as dirty for retry
            this.dirty.add(`${name}:${webinarId}`);
          }
        }
      });

      // Reset failure counter on success
      if (metrics.errors.length === 0) {
        this.failureCounts.set(webinarId, 0);
        if (this.degradedState.get(webinarId)) {
          this.degradedState.set(webinarId, false);
          this.logger.info(`Persistence recovered for ${webinarId}`);
        }
      }

      this.persistedWebinarIds.add(webinarId);
    } catch (err) {
      const errMsg = `Transaction flush failed for ${webinarId}: ${err}`;
      metrics.errors.push(errMsg);
      this.logger.error(errMsg);

      // Re-mark ALL attempted stores as dirty
      for (const key of dirtySnapshot) {
        this.dirty.add(key);
      }

      // Increment failure counter and check for degraded state
      const failures = (this.failureCounts.get(webinarId) || 0) + 1;
      this.failureCounts.set(webinarId, failures);

      if (failures >= this.config.maxRetries && !this.degradedState.get(webinarId)) {
        this.degradedState.set(webinarId, true);
        this.logger.error(`CRITICAL: Persistence degraded for ${webinarId} after ${failures} consecutive failures`);
        this.bus.emit('webinar:persistence-degraded', {
          webinarId,
          consecutiveFailures: failures,
          lastError: String(err),
          timestamp: new Date(),
        });
      }
    }

    metrics.durationMs = Date.now() - start;
    this.flushInProgress.set(webinarId, false);

    // Emit metrics for monitoring
    if (this.config.emitMetrics) {
      this.bus.emit('webinar:flush-metrics', metrics);
    }

    return metrics;
  }

  // ─── Full Store Flush (Tier 1 & 3) ────────────────────────────────────

  private async flushFullStore(webinarId: string, name: string, entry: StoreEntry): Promise<number> {
    const data = entry.serialise(webinarId);
    if (data === undefined || data === null) return 0;

    await this.storage.set(entry.collection, webinarId, data);

    // For arrays, return the element count. For objects, count 1.
    if (Array.isArray(data)) return data.length;
    if (data instanceof Map) return data.size;
    return 1;
  }

  // ─── Append Store Flush (Tier 2) ──────────────────────────────────────
  //
  // Instead of writing the entire chat history (potentially 50,000 messages)
  // on every flush, we only write records added since the last successful
  // flush. Think of it as the stenographer only printing new pages, not
  // reprinting the entire transcript each time.

  private async flushAppendStore(webinarId: string, name: string, entry: StoreEntry): Promise<number> {
    const cursorKey = `${name}:${webinarId}`;
    const cursor = this.appendCursors.get(cursorKey) || { storeKey: cursorKey, lastFlushedIndex: 0 };

    const fullData = entry.serialise(webinarId);
    if (!Array.isArray(fullData)) {
      // If it's not an array, fall back to full flush
      return this.flushFullStore(webinarId, name, entry);
    }

    const newRecords = fullData.slice(cursor.lastFlushedIndex);
    if (newRecords.length === 0) return 0;

    // Load existing persisted data and append
    const existing = await this.storage.get<unknown[]>(entry.collection, webinarId);
    const merged = existing ? [...existing, ...newRecords] : newRecords;
    await this.storage.set(entry.collection, webinarId, merged);

    // Advance the cursor
    cursor.lastFlushedIndex = fullData.length;
    this.appendCursors.set(cursorKey, cursor);

    return newRecords.length;
  }

  // ─── Rehydration (Crash Recovery) ──────────────────────────────────────
  //
  // When the plugin initialises after a crash or restart, we query the
  // StorageAdapter for any persisted webinar data and reconstruct the
  // in-memory Maps. This is the court reporter reading back yesterday's
  // transcript to catch up.

  async rehydrate(): Promise<RehydrationResult> {
    const result: RehydrationResult = { rehydrated: 0, skipped: 0, errors: [] };

    if (!this.config.rehydrateOnInit) return result;

    try {
      // Query for all webinars in the database
      const webinarStore = this.stores.get('webinars');
      if (!webinarStore) {
        result.errors.push('No webinar store registered — cannot rehydrate');
        return result;
      }

      const maxAge = new Date(Date.now() - this.config.rehydrationMaxAgeMs);

      // Discover persisted webinar IDs by querying the webinars collection
      const webinarRecords = await this.storage.query<{ id: string; phase: string; updatedAt: string | Date }>(
        webinarStore.collection,
        {},
      );

      for (const record of webinarRecords) {
        try {
          const updatedAt = record.updatedAt instanceof Date ? record.updatedAt : new Date(record.updatedAt);

          // Skip records older than the rehydration window
          if (updatedAt < maxAge) {
            result.skipped++;
            continue;
          }

          // Skip terminal-phase webinars (they don't need live state)
          if (record.phase === 'ended' || record.phase === 'cancelled') {
            result.skipped++;
            continue;
          }

          const webinarId = record.id;

          // Rehydrate each registered store
          for (const [name, entry] of this.stores) {
            try {
              const data = await this.storage.get<unknown>(entry.collection, webinarId);
              if (data !== null && data !== undefined) {
                entry.deserialise(webinarId, data);

                // Reset append cursors to the rehydrated data length
                if (entry.tier === 2 && Array.isArray(data)) {
                  this.appendCursors.set(`${name}:${webinarId}`, {
                    storeKey: `${name}:${webinarId}`,
                    lastFlushedIndex: data.length,
                  });
                }
              }
            } catch (storeErr) {
              result.errors.push(`Failed to rehydrate ${name} for ${webinarId}: ${storeErr}`);
            }
          }

          this.persistedWebinarIds.add(webinarId);
          result.rehydrated++;
          this.logger.info(`Rehydrated webinar ${webinarId} (phase: ${record.phase})`);
        } catch (recordErr) {
          result.errors.push(`Failed to rehydrate webinar ${record.id}: ${recordErr}`);
        }
      }

      this.logger.info(`Rehydration complete: ${result.rehydrated} restored, ${result.skipped} skipped, ${result.errors.length} errors`);
    } catch (err) {
      result.errors.push(`Rehydration query failed: ${err}`);
      this.logger.error(`Rehydration failed: ${err}`);
    }

    return result;
  }

  // ─── State Inspection ──────────────────────────────────────────────────

  getFlushTimerCount(): number {
    return this.flushTimers.size;
  }

  isWebinarPersisted(webinarId: string): boolean {
    return this.persistedWebinarIds.has(webinarId);
  }

  isWebinarDegraded(webinarId: string): boolean {
    return this.degradedState.get(webinarId) || false;
  }

  getConsecutiveFailures(webinarId: string): number {
    return this.failureCounts.get(webinarId) || 0;
  }

  getAppendCursor(storeKey: string): number {
    return this.appendCursors.get(storeKey)?.lastFlushedIndex || 0;
  }

  getCycleCount(webinarId: string): number {
    return this.cycleCounters.get(webinarId) || 0;
  }

  /**
   * Destroy all timers and state — for use in tests and shutdown.
   */
  destroy(): void {
    for (const [, timer] of this.flushTimers) clearInterval(timer);
    this.flushTimers.clear();
    this.dirty.clear();
    this.appendCursors.clear();
    this.cycleCounters.clear();
    this.failureCounts.clear();
    this.degradedState.clear();
    this.flushInProgress.clear();
  }
}

export default WriteBehindManager;
