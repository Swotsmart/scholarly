'use client';

// =============================================================================
// USE MENU SYNC HOOK
// =============================================================================
// React hook that wires the MenuSyncService into the component lifecycle.
//
// Three responsibilities:
//   1. Session-start sync: on mount (or return from 30+ min inactivity),
//      fetch server state and reconcile with local state.
//   2. Debounced save: when local state changes (pin, reorder, etc.),
//      save to server after a 2-second debounce.
//   3. Connectivity awareness: when the browser comes back online after
//      being offline, trigger a sync immediately.
//
// Think of this hook as the mailroom. It handles all the incoming and
// outgoing mail (state) between the building (local store) and the
// postal service (server). It knows when to send, when to receive,
// and when the phones are down (offline).
//
// Specification references:
//   Section 8   — Cross-Device Synchronisation
//   Section 8.2 — Offline Behaviour
//   Phase 6 plan — "Cross-device sync with conflict resolution"
//
// Integration:
//   Used in the root layout or sidebar to initialise sync on app load.
//   The composing-menu-store.ts subscribe() fires debounced saves.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

import type { MenuSyncService, SyncResult } from './menu-sync.service';

// =============================================================================
// TYPES
// =============================================================================

export interface UseMenuSyncOptions {
  /** The current user ID. Sync is skipped if null (not logged in). */
  userId: string | null;

  /** The current active role ID. */
  roleId: string;

  /** The sync service instance (injected for testability). */
  syncService: MenuSyncService;

  /** Debounce delay for saving after local changes (ms). Default: 2000. */
  saveDebounceMs?: number;

  /**
   * Inactivity threshold (ms). If the user returns after this duration,
   * a full sync is triggered rather than just a save. Default: 30 minutes.
   */
  inactivityThresholdMs?: number;

  /**
   * Callback when sync completes. Used to chain push sync (Phase 5).
   * The push sync service should run AFTER menu sync completes so that
   * the push items layer onto the freshly-synced menu state.
   */
  onSyncComplete?: (result: SyncResult) => void;

  /** Callback when sync fails. Used for error reporting. */
  onSyncError?: (error: string) => void;

  /**
   * Subscribe to local store changes. Returns an unsubscribe function.
   * This is the bridge between Zustand's subscribe() and the sync hook.
   */
  subscribeToStoreChanges: (callback: () => void) => () => void;
}

export interface UseMenuSyncReturn {
  /** Whether a sync is currently in progress. */
  isSyncing: boolean;

  /** The most recent sync result, or null if no sync has completed. */
  lastSyncResult: SyncResult | null;

  /** Whether the browser is currently online. */
  isOnline: boolean;

  /** Whether there are unsaved local changes pending server save. */
  hasPendingChanges: boolean;

  /** Manually trigger a full sync (for "Sync Now" button in settings). */
  triggerSync: () => Promise<void>;

  /** The local menu version. */
  localVersion: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SAVE_DEBOUNCE_MS = 2_000;
const DEFAULT_INACTIVITY_THRESHOLD_MS = 30 * 60 * 1_000; // 30 minutes

// =============================================================================
// HOOK
// =============================================================================

export function useMenuSync({
  userId,
  roleId,
  syncService,
  saveDebounceMs = DEFAULT_SAVE_DEBOUNCE_MS,
  inactivityThresholdMs = DEFAULT_INACTIVITY_THRESHOLD_MS,
  onSyncComplete,
  onSyncError,
  subscribeToStoreChanges,
}: UseMenuSyncOptions): UseMenuSyncReturn {
  // ── State ──

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

  // ── Refs (stable across renders) ──

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);
  const syncInProgressRef = useRef(false);

  // ── Full sync function ──

  const performSync = useCallback(async () => {
    if (!userId || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    if (isMountedRef.current) setIsSyncing(true);

    try {
      const result = await syncService.syncOnSessionStart(userId, roleId);

      if (!isMountedRef.current) return;

      if (result.ok) {
        setLastSyncResult(result.value);
        setLocalVersion(result.value.version);
        setHasPendingChanges(false);
        onSyncComplete?.(result.value);
      } else {
        onSyncError?.(result.error);
      }
    } catch (err) {
      if (isMountedRef.current) {
        onSyncError?.(err instanceof Error ? err.message : 'Sync failed');
      }
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false);
        syncInProgressRef.current = false;
      }
    }
  }, [userId, roleId, syncService, onSyncComplete, onSyncError]);

  // ── Debounced save function ──

  const debouncedSave = useCallback(() => {
    if (!userId || !isOnline) {
      setHasPendingChanges(true);
      return;
    }

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setHasPendingChanges(true);

    saveTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current || !userId) return;

      try {
        const result = await syncService.saveToServer(userId, roleId);

        if (!isMountedRef.current) return;

        if (result.ok) {
          setLocalVersion(result.value.version);
          setHasPendingChanges(false);
        }
        // If save fails, changes remain pending — will sync on next session start.
      } catch {
        // Non-fatal. Local state is still correct.
      }
    }, saveDebounceMs);
  }, [userId, roleId, syncService, isOnline, saveDebounceMs]);

  // ── Sync on mount (session start) ──

  useEffect(() => {
    isMountedRef.current = true;
    performSync();

    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [performSync]);

  // ── Subscribe to local store changes for debounced save ──

  useEffect(() => {
    const unsubscribe = subscribeToStoreChanges(() => {
      lastActivityRef.current = Date.now();
      debouncedSave();
    });

    return unsubscribe;
  }, [subscribeToStoreChanges, debouncedSave]);

  // ── Online/offline detection ──

  useEffect(() => {
    const handleOnline = () => {
      if (!isMountedRef.current) return;
      setIsOnline(true);

      // Back online — sync immediately
      performSync();
    };

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  // ── Visibility change (return from background/inactivity) ──

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isMountedRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= inactivityThresholdMs) {
        // Been away for 30+ minutes — full sync
        performSync();
      }

      lastActivityRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [performSync, inactivityThresholdMs]);

  // ── Public trigger for manual sync ──

  const triggerSync = useCallback(async () => {
    await performSync();
  }, [performSync]);

  return {
    isSyncing,
    lastSyncResult,
    isOnline,
    hasPendingChanges,
    triggerSync,
    localVersion,
  };
}
