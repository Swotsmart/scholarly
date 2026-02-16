// =============================================================================
// CROSS-DEVICE MENU SYNC SERVICE
// =============================================================================
// This service synchronises menu state across all of a user's devices.
//
// Think of menu state like a document in Google Docs. When you edit on your
// laptop and then open your phone, the phone should show the latest version.
// If you were offline on both devices and made changes to each, the most
// recent edit wins — acceptable here because menu adjustments are low-friction
// and easily undone (unlike, say, a term paper).
//
// The sync strategy is deliberately simple: version-based optimistic
// concurrency. Each save increments a menuVersion counter. On session start,
// the client compares its local version against the server. Higher version
// wins. Ties resolve to server (canonical source). This piggybacks on the
// existing federated knowledge tracing infrastructure (883 + 981 lines)
// already built for multi-device phonics state reconciliation.
//
// Specification references:
//   Section 8   — Cross-Device Synchronisation
//   Section 8.1 — Sync Rules (4 scenarios)
//   Section 8.2 — Offline Behaviour
//   Section 17  — Data Models (UserMenuState with menuVersion)
//   Phase 6 plan — "Cross-device sync with conflict resolution: 2–3 days"
//
// Integration points:
//   - composing-menu-store.ts (Phase 1): getState, setState, subscribe
//   - push-client-reception.tsx (Phase 5): PushSyncService runs after menu sync
//   - federated-knowledge-tracing.ts: existing sync infrastructure
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

/**
 * The server-side menu state record. One per user per role.
 * Maps to the UserMenuState Prisma model from Section 17.2.
 */
export interface ServerMenuState {
  /** The user this state belongs to. */
  userId: string;

  /** The role this menu state applies to (each role has independent menu). */
  roleId: string;

  /** The serialised menu items array (JSON string in DB, parsed here). */
  items: MenuItemSnapshot[];

  /**
   * Monotonically increasing version counter. Every save increments this.
   * The client compares local vs server version to determine sync direction.
   */
  menuVersion: number;

  /** ISO timestamp of the last seed engine run for this user+role. */
  lastSeedRun: string | null;

  /** ISO timestamp of the last modification. Used for last-write-wins. */
  updatedAt: string;

  /** ISO timestamp of when this record was first created. */
  createdAt: string;
}

/**
 * A snapshot of a single menu item's state. This is the shape stored in
 * the items JSON field of UserMenuState. It's a projection of the full
 * MenuItemState from Phase 1's store, containing only the fields needed
 * for sync — no ephemeral UI state like hover or animation flags.
 */
export interface MenuItemSnapshot {
  ref: string;
  state: 'anchor' | 'active' | 'seeded' | 'decaying' | 'overflow' | 'pushed' | 'removed';
  pinned: boolean;
  lastUsed: string | null;
  useCount: number;
  position: number;
  addedAt: string;
  decayStartedAt: string | null;
  seedScore: number | null;
  pushId: string | null;
  pushReason: string | null;
  pushExpiry: string | null;
}

/**
 * The result of a sync operation.
 */
export interface SyncResult {
  /** Whether the sync completed without errors. */
  success: boolean;

  /** The direction of data flow, or 'none' if already in sync. */
  direction: 'server_to_client' | 'client_to_server' | 'none';

  /** The version after sync. */
  version: number;

  /** Number of items that changed during sync. */
  itemsChanged: number;

  /** Human-readable summary for logging. */
  summary: string;

  /** If sync failed, the error message. */
  error?: string;
}

/**
 * Conflict detection result when both sides have diverged.
 */
export interface ConflictAnalysis {
  /** Whether a conflict was detected (both sides changed since last sync). */
  hasConflict: boolean;

  /** Which side has the more recent updatedAt timestamp. */
  winner: 'server' | 'client';

  /** Time difference between the two sides in milliseconds. */
  timeDeltaMs: number;

  /** Items present on server but not client. */
  serverOnlyItems: string[];

  /** Items present on client but not server. */
  clientOnlyItems: string[];

  /** Items present on both but with different states. */
  divergedItems: string[];
}

/**
 * Options for the sync service.
 */
export interface MenuSyncOptions {
  /** How long to wait for the server response before timing out (ms). */
  timeoutMs: number;

  /** Whether to emit events for sync lifecycle (for push sync chaining). */
  emitEvents: boolean;

  /** Whether to log sync details for debugging. */
  verbose: boolean;
}

const DEFAULT_OPTIONS: MenuSyncOptions = {
  timeoutMs: 10_000,
  emitEvents: true,
  verbose: false,
};

// =============================================================================
// RESULT TYPE
// =============================================================================

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code: SyncErrorCode };

export type SyncErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_STATE'
  | 'CONFLICT_UNRESOLVABLE'
  | 'STORAGE_ERROR';

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

/**
 * Abstracts server-side persistence. Production uses Prisma; tests use
 * InMemoryMenuStateRepository.
 */
export interface MenuStateRepository {
  /** Fetch the latest menu state for a user+role. Returns null if none exists. */
  getMenuState(userId: string, roleId: string): Promise<ServerMenuState | null>;

  /** Save menu state. Creates if new, updates if existing. Returns the saved state. */
  saveMenuState(state: ServerMenuState): Promise<ServerMenuState>;

  /** Atomically increment version and update items + updatedAt. */
  updateMenuState(
    userId: string,
    roleId: string,
    items: MenuItemSnapshot[],
    currentVersion: number,
  ): Promise<ServerMenuState | null>;
}

/**
 * Abstracts client-side local storage. Production uses Zustand persist
 * middleware (localStorage); tests use InMemoryLocalStore.
 */
export interface LocalMenuStore {
  /** Get the current local menu items for a role. */
  getItems(roleId: string): MenuItemSnapshot[];

  /** Get the locally stored version number for a role. */
  getVersion(roleId: string): number;

  /** Get the locally stored updatedAt timestamp for a role. */
  getUpdatedAt(roleId: string): string;

  /** Replace local state with new items and version. */
  setItems(roleId: string, items: MenuItemSnapshot[], version: number): void;

  /** Get the last seed run timestamp. */
  getLastSeedRun(roleId: string): string | null;
}

/**
 * Event emitter for sync lifecycle events. The push sync service
 * (Phase 5) listens for 'sync_complete' to trigger push reconciliation.
 */
export interface SyncEventEmitter {
  emit(event: SyncEvent): void;
}

export type SyncEvent =
  | { type: 'sync_started'; userId: string; roleId: string }
  | { type: 'sync_complete'; userId: string; roleId: string; result: SyncResult }
  | { type: 'sync_error'; userId: string; roleId: string; error: string }
  | { type: 'conflict_detected'; userId: string; roleId: string; analysis: ConflictAnalysis }
  | { type: 'state_pushed'; userId: string; roleId: string; version: number };

// =============================================================================
// MENU SYNC SERVICE
// =============================================================================

export class MenuSyncService {
  private readonly repository: MenuStateRepository;
  private readonly localStore: LocalMenuStore;
  private readonly events: SyncEventEmitter;
  private readonly options: MenuSyncOptions;

  /** Track in-flight syncs to prevent concurrent syncs for the same role. */
  private activeSyncs = new Set<string>();

  /** Sync history for monitoring (last 50 operations). */
  private history: Array<{ roleId: string; result: SyncResult; timestamp: string }> = [];

  constructor(
    repository: MenuStateRepository,
    localStore: LocalMenuStore,
    events: SyncEventEmitter,
    options: Partial<MenuSyncOptions> = {},
  ) {
    this.repository = repository;
    this.localStore = localStore;
    this.events = events;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ── Primary sync operation ──

  /**
   * Synchronise menu state for a user+role on session start.
   *
   * The algorithm:
   * 1. Fetch server state
   * 2. Compare versions
   * 3. If server > local: server wins (pull)
   * 4. If local > server: client wins (push)
   * 5. If equal: no action needed
   * 6. If both changed (conflict): last-write-wins based on updatedAt
   *
   * This is called on every session start (login, page load, return
   * from 30+ minutes of inactivity).
   */
  async syncOnSessionStart(
    userId: string,
    roleId: string,
  ): Promise<Result<SyncResult>> {
    const syncKey = `${userId}:${roleId}`;

    // Prevent concurrent syncs for the same user+role
    if (this.activeSyncs.has(syncKey)) {
      return {
        ok: false,
        error: 'Sync already in progress for this role.',
        code: 'INVALID_STATE',
      };
    }

    this.activeSyncs.add(syncKey);

    if (this.options.emitEvents) {
      this.events.emit({ type: 'sync_started', userId, roleId });
    }

    try {
      // 1. Fetch server state
      const serverState = await this.fetchWithTimeout(
        () => this.repository.getMenuState(userId, roleId),
      );

      // 2. Get local state
      const localItems = this.localStore.getItems(roleId);
      const localVersion = this.localStore.getVersion(roleId);
      const localUpdatedAt = this.localStore.getUpdatedAt(roleId);

      // 3. Determine sync direction
      let result: SyncResult;

      if (serverState === null) {
        // No server state — this is a new user or first sync.
        // Push local state to server (establishing the canonical copy).
        result = await this.pushToServer(userId, roleId, localItems, 0);
      } else if (serverState.menuVersion > localVersion) {
        // Server is ahead — pull server state to client.
        result = this.pullFromServer(roleId, serverState);
      } else if (localVersion > serverState.menuVersion) {
        // Client is ahead — push local state to server.
        result = await this.pushToServer(
          userId, roleId, localItems, serverState.menuVersion,
        );
      } else {
        // Versions match — check for divergence (same version, different content).
        const analysis = this.analyseConflict(
          serverState.items, localItems,
          serverState.updatedAt, localUpdatedAt,
        );

        if (!analysis.hasConflict) {
          // Truly in sync — no action needed.
          result = {
            success: true,
            direction: 'none',
            version: serverState.menuVersion,
            itemsChanged: 0,
            summary: `Already in sync at version ${serverState.menuVersion}.`,
          };
        } else {
          // Same version but different content — conflict!
          if (this.options.emitEvents) {
            this.events.emit({ type: 'conflict_detected', userId, roleId, analysis });
          }

          // Resolve via last-write-wins.
          if (analysis.winner === 'server') {
            result = this.pullFromServer(roleId, serverState);
            result.summary = `Conflict resolved: server wins (${analysis.timeDeltaMs}ms newer). ${result.itemsChanged} items updated.`;
          } else {
            result = await this.pushToServer(
              userId, roleId, localItems, serverState.menuVersion,
            );
            result.summary = `Conflict resolved: client wins (${analysis.timeDeltaMs}ms newer). ${result.itemsChanged} items pushed.`;
          }
        }
      }

      // Record in history
      this.recordHistory(roleId, result);

      if (this.options.emitEvents) {
        this.events.emit({ type: 'sync_complete', userId, roleId, result });
      }

      return { ok: true, value: result };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown sync error';

      if (this.options.emitEvents) {
        this.events.emit({ type: 'sync_error', userId, roleId, error: errorMsg });
      }

      // Sync failure is non-fatal — the menu works from local state.
      return {
        ok: false,
        error: errorMsg,
        code: this.classifyError(err),
      };
    } finally {
      this.activeSyncs.delete(syncKey);
    }
  }

  // ── Save after local changes ──

  /**
   * Push the current local state to the server after a local change.
   * Called whenever the user modifies their menu (pin, reorder, etc.)
   * with a debounce of ~2 seconds to batch rapid changes.
   *
   * This is a fire-and-forget operation — if it fails, the local state
   * is still correct and will sync on next session start.
   */
  async saveToServer(
    userId: string,
    roleId: string,
  ): Promise<Result<{ version: number }>> {
    try {
      const localItems = this.localStore.getItems(roleId);
      const localVersion = this.localStore.getVersion(roleId);

      const updated = await this.repository.updateMenuState(
        userId, roleId, localItems, localVersion,
      );

      if (!updated) {
        return {
          ok: false,
          error: 'Version conflict during save. Will resolve on next sync.',
          code: 'CONFLICT_UNRESOLVABLE',
        };
      }

      // Update local version to match server
      this.localStore.setItems(roleId, localItems, updated.menuVersion);

      if (this.options.emitEvents) {
        this.events.emit({
          type: 'state_pushed',
          userId, roleId,
          version: updated.menuVersion,
        });
      }

      return { ok: true, value: { version: updated.menuVersion } };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Save failed',
        code: this.classifyError(err),
      };
    }
  }

  // ── Conflict analysis ──

  /**
   * Analyse the difference between server and client state.
   * Used when versions are equal but content may have diverged
   * (e.g. offline edits on both sides, then both synced to same version).
   */
  analyseConflict(
    serverItems: MenuItemSnapshot[],
    clientItems: MenuItemSnapshot[],
    serverUpdatedAt: string,
    clientUpdatedAt: string,
  ): ConflictAnalysis {
    const serverRefs = new Set(serverItems.map(i => i.ref));
    const clientRefs = new Set(clientItems.map(i => i.ref));

    const serverOnlyItems = [...serverRefs].filter(r => !clientRefs.has(r));
    const clientOnlyItems = [...clientRefs].filter(r => !serverRefs.has(r));

    // Find items present on both but with different states
    const divergedItems: string[] = [];
    for (const ref of serverRefs) {
      if (!clientRefs.has(ref)) continue;
      const serverItem = serverItems.find(i => i.ref === ref)!;
      const clientItem = clientItems.find(i => i.ref === ref)!;

      if (
        serverItem.state !== clientItem.state ||
        serverItem.pinned !== clientItem.pinned ||
        serverItem.position !== clientItem.position ||
        serverItem.useCount !== clientItem.useCount
      ) {
        divergedItems.push(ref);
      }
    }

    const hasConflict =
      serverOnlyItems.length > 0 ||
      clientOnlyItems.length > 0 ||
      divergedItems.length > 0;

    const serverTime = new Date(serverUpdatedAt).getTime();
    const clientTime = new Date(clientUpdatedAt).getTime();
    const timeDeltaMs = Math.abs(serverTime - clientTime);
    const winner: 'server' | 'client' = serverTime >= clientTime ? 'server' : 'client';

    return {
      hasConflict,
      winner,
      timeDeltaMs,
      serverOnlyItems,
      clientOnlyItems,
      divergedItems,
    };
  }

  // ── Query methods ──

  /** Get sync history for monitoring dashboards. */
  getHistory(): ReadonlyArray<{ roleId: string; result: SyncResult; timestamp: string }> {
    return this.history;
  }

  /** Check if a sync is currently in progress for a role. */
  isSyncing(userId: string, roleId: string): boolean {
    return this.activeSyncs.has(`${userId}:${roleId}`);
  }

  // ── Private helpers ──

  private pullFromServer(roleId: string, serverState: ServerMenuState): SyncResult {
    const localItems = this.localStore.getItems(roleId);
    const itemsChanged = this.countChanges(localItems, serverState.items);

    this.localStore.setItems(roleId, serverState.items, serverState.menuVersion);

    return {
      success: true,
      direction: 'server_to_client',
      version: serverState.menuVersion,
      itemsChanged,
      summary: `Pulled version ${serverState.menuVersion} from server. ${itemsChanged} items changed.`,
    };
  }

  private async pushToServer(
    userId: string,
    roleId: string,
    localItems: MenuItemSnapshot[],
    currentVersion: number,
  ): Promise<SyncResult> {
    const updated = await this.repository.updateMenuState(
      userId, roleId, localItems, currentVersion,
    );

    if (!updated) {
      // Concurrent modification — rare but possible. Treat as conflict.
      throw new Error('Concurrent modification detected during push. Retry on next session start.');
    }

    this.localStore.setItems(roleId, localItems, updated.menuVersion);

    return {
      success: true,
      direction: 'client_to_server',
      version: updated.menuVersion,
      itemsChanged: localItems.length,
      summary: `Pushed ${localItems.length} items to server as version ${updated.menuVersion}.`,
    };
  }

  private countChanges(
    before: MenuItemSnapshot[],
    after: MenuItemSnapshot[],
  ): number {
    const beforeMap = new Map(before.map(i => [i.ref, i]));
    const afterMap = new Map(after.map(i => [i.ref, i]));

    let changes = 0;

    // Items added or changed
    for (const [ref, item] of afterMap) {
      const prev = beforeMap.get(ref);
      if (!prev || prev.state !== item.state || prev.position !== item.position) {
        changes++;
      }
    }

    // Items removed
    for (const ref of beforeMap.keys()) {
      if (!afterMap.has(ref)) changes++;
    }

    return changes;
  }

  private async fetchWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout')), this.options.timeoutMs),
      ),
    ]);
  }

  private classifyError(err: unknown): SyncErrorCode {
    if (err instanceof Error) {
      if (err.message.includes('timeout') || err.message.includes('Timeout')) return 'TIMEOUT';
      if (err.message.includes('network') || err.message.includes('fetch')) return 'NETWORK_ERROR';
      if (err.message.includes('500') || err.message.includes('server')) return 'SERVER_ERROR';
      if (err.message.includes('storage') || err.message.includes('localStorage')) return 'STORAGE_ERROR';
    }
    return 'NETWORK_ERROR';
  }

  private recordHistory(roleId: string, result: SyncResult): void {
    this.history.push({ roleId, result, timestamp: new Date().toISOString() });
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }
}

// =============================================================================
// IN-MEMORY IMPLEMENTATIONS (FOR TESTING)
// =============================================================================

export class InMemoryMenuStateRepository implements MenuStateRepository {
  private states = new Map<string, ServerMenuState>();

  private key(userId: string, roleId: string): string {
    return `${userId}::${roleId}`;
  }

  async getMenuState(userId: string, roleId: string): Promise<ServerMenuState | null> {
    return this.states.get(this.key(userId, roleId)) ?? null;
  }

  async saveMenuState(state: ServerMenuState): Promise<ServerMenuState> {
    this.states.set(this.key(state.userId, state.roleId), state);
    return state;
  }

  async updateMenuState(
    userId: string,
    roleId: string,
    items: MenuItemSnapshot[],
    currentVersion: number,
  ): Promise<ServerMenuState | null> {
    const key = this.key(userId, roleId);
    const existing = this.states.get(key);

    if (existing && existing.menuVersion !== currentVersion) {
      return null; // Version conflict
    }

    const newVersion = (existing?.menuVersion ?? 0) + 1;
    const updated: ServerMenuState = {
      userId,
      roleId,
      items,
      menuVersion: newVersion,
      lastSeedRun: existing?.lastSeedRun ?? null,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    this.states.set(key, updated);
    return updated;
  }

  // Test helper
  clear(): void {
    this.states.clear();
  }
}

export class InMemoryLocalMenuStore implements LocalMenuStore {
  private items = new Map<string, MenuItemSnapshot[]>();
  private versions = new Map<string, number>();
  private updatedAts = new Map<string, string>();
  private seedRuns = new Map<string, string | null>();

  getItems(roleId: string): MenuItemSnapshot[] {
    return this.items.get(roleId) ?? [];
  }

  getVersion(roleId: string): number {
    return this.versions.get(roleId) ?? 0;
  }

  getUpdatedAt(roleId: string): string {
    return this.updatedAts.get(roleId) ?? new Date(0).toISOString();
  }

  setItems(roleId: string, items: MenuItemSnapshot[], version: number): void {
    this.items.set(roleId, items);
    this.versions.set(roleId, version);
    this.updatedAts.set(roleId, new Date().toISOString());
  }

  getLastSeedRun(roleId: string): string | null {
    return this.seedRuns.get(roleId) ?? null;
  }

  // Test helpers
  setVersion(roleId: string, version: number): void {
    this.versions.set(roleId, version);
  }

  setUpdatedAt(roleId: string, timestamp: string): void {
    this.updatedAts.set(roleId, timestamp);
  }

  clear(): void {
    this.items.clear();
    this.versions.clear();
    this.updatedAts.clear();
    this.seedRuns.clear();
  }
}

export class InMemorySyncEventEmitter implements SyncEventEmitter {
  public events: SyncEvent[] = [];

  emit(event: SyncEvent): void {
    this.events.push(event);
  }

  getEventsOfType<T extends SyncEvent['type']>(
    type: T,
  ): Extract<SyncEvent, { type: T }>[] {
    return this.events.filter(e => e.type === type) as Extract<SyncEvent, { type: T }>[];
  }

  clear(): void {
    this.events = [];
  }
}
