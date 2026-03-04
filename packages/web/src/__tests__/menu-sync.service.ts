// =============================================================================
// MENU SYNC SERVICE — In-memory implementation for testing
// =============================================================================

export interface MenuItemSnapshot {
  ref: string;
  state: string;
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

export interface ConflictAnalysis {
  hasConflict: boolean;
  serverOnlyItems: string[];
  clientOnlyItems: string[];
  divergedItems: string[];
  winner: 'server' | 'client' | 'none';
}

interface MenuState {
  userId: string;
  roleId: string;
  items: MenuItemSnapshot[];
  menuVersion: number;
  lastSeedRun: string | null;
  updatedAt: string;
  createdAt: string;
}

interface SyncEvent {
  type: string;
  data?: unknown;
  timestamp: string;
}

type SyncResult =
  | { ok: true; value: { direction: string; version: number; itemsChanged: number } }
  | { ok: false; error: string };

type SaveResult =
  | { ok: true; value: { version: number } }
  | { ok: false; error: string };

// ── InMemoryMenuStateRepository ──

export class InMemoryMenuStateRepository {
  private store = new Map<string, MenuState>();

  private key(userId: string, roleId: string): string {
    return `${userId}:${roleId}`;
  }

  async saveMenuState(state: MenuState): Promise<void> {
    this.store.set(this.key(state.userId, state.roleId), { ...state });
  }

  async getMenuState(userId: string, roleId: string): Promise<MenuState | null> {
    return this.store.get(this.key(userId, roleId)) ?? null;
  }
}

// ── InMemoryLocalMenuStore ──

export class InMemoryLocalMenuStore {
  private items = new Map<string, MenuItemSnapshot[]>();
  private versions = new Map<string, number>();
  private updatedAts = new Map<string, string>();

  setItems(roleId: string, items: MenuItemSnapshot[], version: number): void {
    this.items.set(roleId, [...items]);
    this.versions.set(roleId, version);
  }

  getItems(roleId: string): MenuItemSnapshot[] {
    return this.items.get(roleId) ?? [];
  }

  getVersion(roleId: string): number {
    return this.versions.get(roleId) ?? 0;
  }

  setUpdatedAt(roleId: string, time: string): void {
    this.updatedAts.set(roleId, time);
  }

  getUpdatedAt(roleId: string): string {
    return this.updatedAts.get(roleId) ?? new Date().toISOString();
  }
}

// ── InMemorySyncEventEmitter ──

export class InMemorySyncEventEmitter {
  private events: SyncEvent[] = [];

  emit(type: string, data?: unknown): void {
    this.events.push({ type, data, timestamp: new Date().toISOString() });
  }

  getEventsOfType(type: string): SyncEvent[] {
    return this.events.filter(e => e.type === type);
  }
}

// ── MenuSyncService ──

export class MenuSyncService {
  private repo: InMemoryMenuStateRepository;
  private local: InMemoryLocalMenuStore;
  private events: InMemorySyncEventEmitter;
  private inProgress = new Set<string>();
  private history: { roleId: string; timestamp: string; direction: string }[] = [];

  constructor(
    repo: InMemoryMenuStateRepository,
    local: InMemoryLocalMenuStore,
    events: InMemorySyncEventEmitter,
  ) {
    this.repo = repo;
    this.local = local;
    this.events = events;
  }

  async syncOnSessionStart(userId: string, roleId: string): Promise<SyncResult> {
    const syncKey = `${userId}:${roleId}`;

    // Prevent concurrent syncs for the same user+role
    if (this.inProgress.has(syncKey)) {
      return { ok: false, error: 'Sync already in progress for this user+role' };
    }

    this.inProgress.add(syncKey);
    this.events.emit('sync_started', { userId, roleId });

    try {
      const serverState = await this.repo.getMenuState(userId, roleId);
      const localItems = this.local.getItems(roleId);
      const localVersion = this.local.getVersion(roleId);

      let direction: string;
      let version: number;
      let itemsChanged: number;

      if (!serverState) {
        // No server state — push local to server
        version = 1;
        await this.repo.saveMenuState({
          userId,
          roleId,
          items: localItems,
          menuVersion: version,
          lastSeedRun: null,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        this.local.setItems(roleId, localItems, version);
        direction = 'client_to_server';
        itemsChanged = localItems.length;
      } else if (serverState.menuVersion > localVersion) {
        // Server version is higher — pull from server
        this.local.setItems(roleId, serverState.items, serverState.menuVersion);
        this.local.setUpdatedAt(roleId, serverState.updatedAt);
        direction = 'server_to_client';
        version = serverState.menuVersion;
        itemsChanged = serverState.items.length;
      } else if (localVersion > serverState.menuVersion) {
        // Local version is higher — push to server
        const newVersion = localVersion + 1;
        await this.repo.saveMenuState({
          userId,
          roleId,
          items: localItems,
          menuVersion: newVersion,
          lastSeedRun: serverState.lastSeedRun,
          updatedAt: new Date().toISOString(),
          createdAt: serverState.createdAt,
        });
        this.local.setItems(roleId, localItems, newVersion);
        direction = 'client_to_server';
        version = newVersion;
        itemsChanged = localItems.length;
      } else {
        // Same version — check if items are identical
        const itemsIdentical = this.areItemsIdentical(serverState.items, localItems);

        if (itemsIdentical) {
          direction = 'none';
          version = serverState.menuVersion;
          itemsChanged = 0;
        } else {
          // Conflict: same version, different items
          const serverTime = serverState.updatedAt;
          const clientTime = this.local.getUpdatedAt(roleId);
          const analysis = this.analyseConflict(serverState.items, localItems, serverTime, clientTime);

          this.events.emit('conflict_detected', { userId, roleId, analysis });

          if (analysis.winner === 'server') {
            this.local.setItems(roleId, serverState.items, serverState.menuVersion);
            this.local.setUpdatedAt(roleId, serverState.updatedAt);
            direction = 'server_to_client';
            version = serverState.menuVersion;
            itemsChanged = serverState.items.length;
          } else {
            // Client wins or no conflict
            const newVersion = serverState.menuVersion + 1;
            await this.repo.saveMenuState({
              userId,
              roleId,
              items: localItems,
              menuVersion: newVersion,
              lastSeedRun: serverState.lastSeedRun,
              updatedAt: new Date().toISOString(),
              createdAt: serverState.createdAt,
            });
            this.local.setItems(roleId, localItems, newVersion);
            direction = 'client_to_server';
            version = newVersion;
            itemsChanged = localItems.length;
          }
        }
      }

      this.history.push({
        roleId,
        timestamp: new Date().toISOString(),
        direction,
      });

      this.events.emit('sync_complete', { userId, roleId, direction, version, itemsChanged });

      return { ok: true, value: { direction, version, itemsChanged } };
    } finally {
      this.inProgress.delete(syncKey);
    }
  }

  analyseConflict(
    serverItems: MenuItemSnapshot[],
    clientItems: MenuItemSnapshot[],
    serverTime: string,
    clientTime: string,
  ): ConflictAnalysis {
    const serverRefs = new Set(serverItems.map(i => i.ref));
    const clientRefs = new Set(clientItems.map(i => i.ref));

    const serverOnlyItems = [...serverRefs].filter(ref => !clientRefs.has(ref));
    const clientOnlyItems = [...clientRefs].filter(ref => !serverRefs.has(ref));

    // Find diverged items: same ref but different content
    const divergedItems: string[] = [];
    for (const ref of serverRefs) {
      if (!clientRefs.has(ref)) continue;
      const serverItem = serverItems.find(i => i.ref === ref)!;
      const clientItem = clientItems.find(i => i.ref === ref)!;
      if (!this.isItemIdentical(serverItem, clientItem)) {
        divergedItems.push(ref);
      }
    }

    const hasConflict =
      serverOnlyItems.length > 0 ||
      clientOnlyItems.length > 0 ||
      divergedItems.length > 0;

    let winner: 'server' | 'client' | 'none';
    if (!hasConflict) {
      winner = 'none';
    } else {
      const serverDate = new Date(serverTime).getTime();
      const clientDate = new Date(clientTime).getTime();
      winner = serverDate >= clientDate ? 'server' : 'client';
    }

    return {
      hasConflict,
      serverOnlyItems,
      clientOnlyItems,
      divergedItems,
      winner,
    };
  }

  async saveToServer(userId: string, roleId: string): Promise<SaveResult> {
    const serverState = await this.repo.getMenuState(userId, roleId);
    const localVersion = this.local.getVersion(roleId);
    const localItems = this.local.getItems(roleId);

    if (serverState && serverState.menuVersion > localVersion) {
      return { ok: false, error: 'Server version is higher than local version' };
    }

    const newVersion = (serverState?.menuVersion ?? 0) + 1;
    const now = new Date().toISOString();

    await this.repo.saveMenuState({
      userId,
      roleId,
      items: localItems,
      menuVersion: newVersion,
      lastSeedRun: serverState?.lastSeedRun ?? null,
      updatedAt: now,
      createdAt: serverState?.createdAt ?? now,
    });

    this.local.setItems(roleId, localItems, newVersion);
    this.local.setUpdatedAt(roleId, now);

    this.history.push({
      roleId,
      timestamp: now,
      direction: 'client_to_server',
    });

    return { ok: true, value: { version: newVersion } };
  }

  getHistory(): { roleId: string; timestamp: string; direction: string }[] {
    return [...this.history];
  }

  // ── Private helpers ──

  private areItemsIdentical(a: MenuItemSnapshot[], b: MenuItemSnapshot[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!this.isItemIdentical(a[i]!, b[i]!)) return false;
    }
    return true;
  }

  private isItemIdentical(a: MenuItemSnapshot, b: MenuItemSnapshot): boolean {
    return (
      a.ref === b.ref &&
      a.state === b.state &&
      a.pinned === b.pinned &&
      a.lastUsed === b.lastUsed &&
      a.useCount === b.useCount &&
      a.position === b.position &&
      a.addedAt === b.addedAt &&
      a.decayStartedAt === b.decayStartedAt &&
      a.seedScore === b.seedScore &&
      a.pushId === b.pushId &&
      a.pushReason === b.pushReason &&
      a.pushExpiry === b.pushExpiry
    );
  }
}
