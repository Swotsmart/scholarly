'use client';

// =============================================================================
// PUSH CLIENT RECEPTION
// =============================================================================
// The client-side handler for institutional menu pushes. When an admin
// pushes a menu item to a role, this module detects the push (via
// session-start sync or real-time event), inserts the PUSHED item into
// the composing menu store, and provides the visual components that
// distinguish pushed items from user-earned ones.
//
// Think of pushed items as the school uniform of the menu — you didn't
// choose them, but they're there for a reason, and you can't take them
// off. The lock icon and tooltip explain why they're required.
//
// Specification references:
//   Section 5.1  — Push rules (cannot be removed by user, lock icon)
//   Section 15   — Institutional Push rules summary
//   Section 16   — Toast: "Your school added [Task]: [reason]"
//   Section 17.1 — MenuItemState with pushed fields
//   Section 19   — Accessibility (lock icon: aria-label)
//
// Integration points:
//   - composing-menu-store.ts (Phase 1): applyPush, removePush actions
//   - use-menu-toast.ts (Phase 2): showPushReceived toast
//   - admin-push.service.ts (Phase 5): PushCreatedEvent, PushRevokedEvent
// =============================================================================

import React, { useEffect, useCallback, useMemo, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A push notification received from the server, either via session-start
 * sync (REST) or real-time event (WebSocket/NATS).
 */
export interface PushNotification {
  /** Unique push record ID. */
  pushId: string;

  /** The task reference to insert into the menu. */
  taskRef: string;

  /** Human-readable reason from the admin. */
  reason: string;

  /** Admin user ID who created the push. */
  pushedBy: string;

  /** Optional expiry date (ISO timestamp). */
  expiresAt: string | null;

  /** When the push was created. */
  createdAt: string;
}

/**
 * A push revocation notification. The locked item should be unlocked
 * and transition to ACTIVE (normal lifecycle).
 */
export interface PushRevocationNotification {
  /** The push record ID being revoked. */
  pushId: string;

  /** The task reference to unlock. */
  taskRef: string;
}

/**
 * A push expiry notification. Same effect as revocation but triggered
 * by the expiry handler rather than manual admin action.
 */
export interface PushExpiryNotification {
  /** The push record ID that expired. */
  pushId: string;

  /** The task reference to unlock. */
  taskRef: string;
}

/**
 * The interface the composing menu store must implement for push
 * integration. These actions are added to the store in Phase 5.
 */
export interface PushStoreActions {
  /** Insert a PUSHED item into the menu. Idempotent — if already pushed, updates metadata. */
  applyPush: (push: PushNotification) => void;

  /** Remove a push (revocation or expiry). Item transitions to ACTIVE. */
  removePush: (taskRef: string) => void;

  /** Get all currently pushed items for the active role. */
  getPushedItems: () => PushedMenuItem[];
}

/**
 * A menu item in the PUSHED state with its institutional metadata.
 */
export interface PushedMenuItem {
  ref: string;
  pushId: string;
  reason: string;
  pushedBy: string;
  expiresAt: string | null;
  createdAt: string;
}

// =============================================================================
// PUSH SYNC SERVICE
// =============================================================================

/**
 * Service responsible for synchronising push state between server and
 * client. On session start, it fetches active pushes for the user's
 * role and institution, then applies any that aren't already in the
 * local store. It also removes any local pushes that are no longer
 * active on the server (revoked or expired while offline).
 *
 * This is the equivalent of the federated sync system's session-start
 * reconciliation, but for the push subsystem specifically.
 */
export class PushSyncService {
  private syncInProgress = false;
  private lastSyncTimestamp: string | null = null;

  constructor(
    private readonly fetchActivePushes: (
      institutionId: string,
      role: string,
    ) => Promise<PushNotification[]>,
    private readonly storeActions: PushStoreActions,
    private readonly onPushReceived?: (push: PushNotification) => void,
    private readonly onPushRemoved?: (taskRef: string) => void,
  ) {}

  /**
   * Perform a full sync on session start. Compares server-side active
   * pushes against local store and reconciles differences.
   *
   * Returns the number of changes applied (new pushes + removed pushes).
   */
  async syncOnSessionStart(
    institutionId: string,
    role: string,
  ): Promise<{ added: number; removed: number }> {
    if (this.syncInProgress) {
      return { added: 0, removed: 0 };
    }

    this.syncInProgress = true;

    try {
      const serverPushes = await this.fetchActivePushes(institutionId, role);
      const localPushes = this.storeActions.getPushedItems();

      let added = 0;
      let removed = 0;

      // ── Apply new pushes (on server but not in local store) ──

      const localPushRefs = new Set(localPushes.map(p => p.ref));

      for (const serverPush of serverPushes) {
        if (!localPushRefs.has(serverPush.taskRef)) {
          this.storeActions.applyPush(serverPush);
          this.onPushReceived?.(serverPush);
          added++;
        }
      }

      // ── Remove stale pushes (in local store but not on server) ──

      const serverPushRefs = new Set(serverPushes.map(p => p.taskRef));

      for (const localPush of localPushes) {
        if (!serverPushRefs.has(localPush.ref)) {
          this.storeActions.removePush(localPush.ref);
          this.onPushRemoved?.(localPush.ref);
          removed++;
        }
      }

      this.lastSyncTimestamp = new Date().toISOString();

      return { added, removed };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle a real-time push event (received via WebSocket/NATS while
   * the user is online). This is the instant delivery path — the push
   * appears in the user's menu immediately, without waiting for the
   * next session-start sync.
   */
  handleRealtimePush(push: PushNotification): void {
    this.storeActions.applyPush(push);
    this.onPushReceived?.(push);
  }

  /**
   * Handle a real-time revocation event.
   */
  handleRealtimeRevocation(revocation: PushRevocationNotification): void {
    this.storeActions.removePush(revocation.taskRef);
    this.onPushRemoved?.(revocation.taskRef);
  }

  /**
   * Handle a real-time expiry event.
   */
  handleRealtimeExpiry(expiry: PushExpiryNotification): void {
    this.storeActions.removePush(expiry.taskRef);
    this.onPushRemoved?.(expiry.taskRef);
  }

  /** Whether a sync is currently in progress. */
  get isSyncing(): boolean {
    return this.syncInProgress;
  }

  /** When the last sync completed. Null if never synced. */
  get lastSync(): string | null {
    return this.lastSyncTimestamp;
  }
}

// =============================================================================
// STORE EXTENSIONS — Actions to add to composing-menu-store.ts
// =============================================================================

/**
 * These functions implement the store-level logic for push management.
 * They are designed to be integrated into the existing composing-menu-store.ts
 * (Phase 1, 846 lines) as additional actions.
 *
 * In the store, a PUSHED item has:
 *   state: 'pushed'
 *   pinned: true          (cannot decay)
 *   pushedBy: string      (admin userId)
 *   pushReason: string    (shown in tooltip)
 *   pushExpiry: string?   (optional auto-expiry)
 */

export interface ComposingMenuItem {
  ref: string;
  state: 'anchor' | 'seed' | 'active' | 'decaying' | 'overflow' | 'pushed' | 'dismissed' | 'removed';
  addedAt: string;
  lastUsed: string | null;
  useCount: number;
  pinned: boolean;
  position: number;
  seedScore?: number;
  seedReason?: string;
  pushedBy?: string;
  pushReason?: string;
  pushExpiry?: string;
  pushId?: string;
  dismissedAt?: string;
}

/**
 * Apply a push to the menu items array. Handles three cases:
 *
 * 1. Item doesn't exist → create it as PUSHED
 * 2. Item exists in a non-pushed state → transition to PUSHED
 * 3. Item already PUSHED → update metadata (idempotent)
 *
 * Pushed items are inserted at position 0 (top of menu) per the spec's
 * principle that institutional requirements take visual priority.
 */
export function applyPushToItems(
  items: ComposingMenuItem[],
  push: PushNotification,
): ComposingMenuItem[] {
  const now = new Date().toISOString();
  const existing = items.find(i => i.ref === push.taskRef);

  if (existing) {
    // Update existing item to PUSHED state
    return items.map(item => {
      if (item.ref !== push.taskRef) return item;

      return {
        ...item,
        state: 'pushed' as const,
        pinned: true,
        pushedBy: push.pushedBy,
        pushReason: push.reason,
        pushExpiry: push.expiresAt ?? undefined,
        pushId: push.pushId,
        // Preserve usage data — the item might have been actively used
        // before being pushed, and that history matters
        lastUsed: item.lastUsed,
        useCount: item.useCount,
      };
    });
  }

  // Create new PUSHED item at position 0
  const newItem: ComposingMenuItem = {
    ref: push.taskRef,
    state: 'pushed',
    addedAt: now,
    lastUsed: null,
    useCount: 0,
    pinned: true,
    position: 0,
    pushedBy: push.pushedBy,
    pushReason: push.reason,
    pushExpiry: push.expiresAt ?? undefined,
    pushId: push.pushId,
  };

  // Shift existing positions down to make room
  const reindexed = items.map(item => ({
    ...item,
    position: item.position + 1,
  }));

  return [newItem, ...reindexed];
}

/**
 * Remove a push from the menu items array. The item transitions from
 * PUSHED to ACTIVE — it doesn't disappear. The user earned it (even
 * if they didn't choose it), so it stays in their menu subject to
 * normal lifecycle rules (decay after 30 days of non-use, etc.).
 */
export function removePushFromItems(
  items: ComposingMenuItem[],
  taskRef: string,
): ComposingMenuItem[] {
  return items.map(item => {
    if (item.ref !== taskRef || item.state !== 'pushed') return item;

    return {
      ...item,
      state: 'active' as const,
      pinned: false,
      pushedBy: undefined,
      pushReason: undefined,
      pushExpiry: undefined,
      pushId: undefined,
      lastUsed: item.lastUsed ?? new Date().toISOString(),
    };
  });
}

// =============================================================================
// LOCK ICON COMPONENT
// =============================================================================

export interface LockIconProps {
  /** The reason the item is pushed (shown in tooltip). */
  reason: string;

  /** Optional expiry info. */
  expiresAt: string | null;

  /** Whether reduced motion is preferred. */
  reducedMotion: boolean;
}

/**
 * The lock icon displayed on PUSHED menu items. This is the visual
 * indicator that says "your school requires this" — distinct from
 * the pin icon (which says "I chose to keep this").
 *
 * Spec Section 19: aria-label="Required by your school: [reason]"
 */
export function PushLockIcon({ reason, expiresAt, reducedMotion }: LockIconProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tooltipText = useMemo(() => {
    const base = `Required by your school: ${reason}`;
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysRemaining <= 0) return base;
      if (daysRemaining === 1) return `${base}. Expires tomorrow.`;
      return `${base}. Expires in ${daysRemaining} days.`;
    }
    return base;
  }, [reason, expiresAt]);

  const handleMouseEnter = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <span
      className="push-lock-icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={tooltipText}
      role="img"
    >
      {/* Lock SVG */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
        className="push-lock-icon__svg"
      >
        <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M4 6V4a3 3 0 0 1 6 0v2"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="7" cy="9.5" r="1" fill="currentColor" />
      </svg>

      {/* Tooltip */}
      {showTooltip && (
        <span
          className={`push-lock-icon__tooltip ${reducedMotion ? 'push-lock-icon__tooltip--instant' : ''}`}
          role="tooltip"
        >
          {tooltipText}
        </span>
      )}
    </span>
  );
}

// =============================================================================
// PUSHED ITEM WRAPPER COMPONENT
// =============================================================================

export interface PushedItemWrapperProps {
  /** The pushed item metadata. */
  push: PushedMenuItem;

  /** Whether reduced motion is preferred. */
  reducedMotion: boolean;

  /** The child elements (the actual menu item content). */
  children: React.ReactNode;
}

/**
 * Wrapper component for menu items in the PUSHED state. Similar to
 * DecayItemWrapper (Phase 4), but instead of showing decay visuals,
 * it shows the lock icon and a subtle institutional-requirement
 * visual treatment.
 *
 * Pushed items are NOT draggable for reordering (they can be
 * reordered, per spec Section 5.1, but this is handled by the
 * reorder mechanism allowing them in the drag set).
 */
export function PushedItemWrapper({
  push,
  reducedMotion,
  children,
}: PushedItemWrapperProps) {
  return (
    <div
      className="pushed-item-wrapper"
      data-task-ref={push.ref}
      data-push-id={push.pushId}
      aria-label={`${push.ref}. Required by your school: ${push.reason}`}
    >
      {/* The actual menu item content */}
      <div className="pushed-item-wrapper__content">
        {children}
      </div>

      {/* Lock icon with tooltip */}
      <PushLockIcon
        reason={push.reason}
        expiresAt={push.expiresAt}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}

// =============================================================================
// REACT HOOK: usePushSync
// =============================================================================

/**
 * React hook that manages push synchronisation within a component lifecycle.
 * Triggers sync on mount (session start) and listens for real-time events.
 *
 * Usage in the sidebar component:
 *   const { pushedItems, isSyncing } = usePushSync({
 *     institutionId: user.institutionId,
 *     role: user.role,
 *     storeActions: { applyPush, removePush, getPushedItems },
 *     onPushReceived: (push) => showPushReceivedToast(push),
 *   });
 */
export interface UsePushSyncOptions {
  /** The user's institution ID. Null if not in an institution. */
  institutionId: string | null;

  /** The user's current role. */
  role: string;

  /** Store actions for applying/removing pushes. */
  storeActions: PushStoreActions;

  /** Called when a new push is applied (trigger toast). */
  onPushReceived?: (push: PushNotification) => void;

  /** Called when a push is removed (trigger toast if desired). */
  onPushRemoved?: (taskRef: string) => void;

  /** Custom fetch function. Defaults to API call. */
  fetchActivePushes?: (
    institutionId: string,
    role: string,
  ) => Promise<PushNotification[]>;
}

export interface UsePushSyncResult {
  /** All currently pushed items. */
  pushedItems: PushedMenuItem[];

  /** Whether a sync is currently in progress. */
  isSyncing: boolean;

  /** Manually trigger a sync (e.g., on reconnection). */
  resync: () => Promise<void>;
}

/**
 * Default fetch function that calls the Scholarly API.
 */
async function defaultFetchActivePushes(
  institutionId: string,
  role: string,
): Promise<PushNotification[]> {
  const response = await fetch(
    `/api/v1/menu/pushes/active?institutionId=${encodeURIComponent(institutionId)}&role=${encodeURIComponent(role)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch pushes: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.pushes ?? [];
}

export function usePushSync({
  institutionId,
  role,
  storeActions,
  onPushReceived,
  onPushRemoved,
  fetchActivePushes = defaultFetchActivePushes,
}: UsePushSyncOptions): UsePushSyncResult {
  const syncServiceRef = useRef<PushSyncService | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Initialise sync service
  useEffect(() => {
    if (!institutionId) return;

    syncServiceRef.current = new PushSyncService(
      fetchActivePushes,
      storeActions,
      onPushReceived,
      onPushRemoved,
    );
  }, [institutionId, fetchActivePushes, storeActions, onPushReceived, onPushRemoved]);

  // Sync on session start
  useEffect(() => {
    if (!institutionId || !syncServiceRef.current) return;

    let cancelled = false;

    const doSync = async () => {
      setIsSyncing(true);
      try {
        await syncServiceRef.current!.syncOnSessionStart(institutionId, role);
      } catch (err) {
        console.error('[PushSync] Session-start sync failed:', err);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    doSync();

    return () => { cancelled = true; };
  }, [institutionId, role]);

  const resync = useCallback(async () => {
    if (!institutionId || !syncServiceRef.current) return;

    setIsSyncing(true);
    try {
      await syncServiceRef.current.syncOnSessionStart(institutionId, role);
    } catch (err) {
      console.error('[PushSync] Manual resync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [institutionId, role]);

  const pushedItems = useMemo(
    () => storeActions.getPushedItems(),
    [storeActions],
  );

  return { pushedItems, isSyncing, resync };
}
