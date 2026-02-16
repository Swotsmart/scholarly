'use client';

// =============================================================================
// MENU SETTINGS PAGE
// =============================================================================
// The "control panel" for the self-composing interface. While the sidebar
// adapts automatically, this page gives users full transparency into what's
// happening and manual control when they want it.
//
// Think of it as the thermostat settings page. The house heats and cools
// itself automatically, but if you want to see the schedule, override the
// temperature, or check the sensors, you come here. The house still works
// without you ever visiting this page — but it's there when you need it.
//
// Layout:
//   ┌────────────────────────────────────────────────┐
//   │ Menu Settings                         [Sync ↻] │
//   ├────────────────────────────────────────────────┤
//   │ ANCHORS (drag to reorder)                      │
//   │  ☰ Dashboard  ⊗          📌 pinned             │
//   │  ☰ Students   ⊗          📌 pinned             │
//   ├────────────────────────────────────────────────┤
//   │ ACTIVE ITEMS (drag to reorder)                 │
//   │  ☰ Gradebook  ⊗    Last used: 2 days ago      │
//   │  ☰ Messages   ⊗    Last used: 5 days ago      │
//   ├────────────────────────────────────────────────┤
//   │ DECAYING (will move to overflow soon)          │
//   │  ⚠ Analytics       Decaying: 15 days remain   │
//   │    [Pin to Keep] [Let it go]                   │
//   ├────────────────────────────────────────────────┤
//   │ PUSHED BY YOUR SCHOOL                          │
//   │  🔒 Attendance    Required: "New policy"       │
//   ├────────────────────────────────────────────────┤
//   │ OVERFLOW (previously used)                     │
//   │  ○ Calendar       Moved: 3 weeks ago           │
//   │    [Restore]                                   │
//   └────────────────────────────────────────────────┘
//
// Specification references:
//   Phase 6 plan — "Menu settings page: 2 days — Dedicated page where
//                    users can view all menu items, reorder, pin, unpin,
//                    restore, and see decay timelines"
//
// Integration points:
//   - composing-menu-store.ts (Phase 1): all getters and actions
//   - use-menu-sync.ts (Phase 6): triggerSync, isSyncing, lastSyncResult
//   - Phase 4: decay timelines (decayStartedAt, days remaining)
//   - Phase 5: pushed items display
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface MenuSettingsItem {
  ref: string;
  label: string;
  icon: string;
  state: 'anchor' | 'active' | 'seeded' | 'decaying' | 'overflow' | 'pushed' | 'removed';
  pinned: boolean;
  lastUsed: string | null;
  useCount: number;
  position: number;
  addedAt: string;
  decayStartedAt: string | null;
  pushReason: string | null;
  pushExpiry: string | null;
}

export interface MenuSettingsPageProps {
  /** All menu items across all states for the current role. */
  items: MenuSettingsItem[];

  /** The current role label (e.g., "Teacher"). */
  roleLabel: string;

  /** Sync status from useMenuSync. */
  syncStatus: {
    isSyncing: boolean;
    isOnline: boolean;
    hasPendingChanges: boolean;
    lastSyncResult: { version: number; summary: string } | null;
    localVersion: number;
  };

  // ── Actions ──
  onReorder: (ref: string, newPosition: number) => void;
  onPin: (ref: string) => void;
  onUnpin: (ref: string) => void;
  onRestore: (ref: string) => void;
  onRemove: (ref: string) => void;
  onTriggerSync: () => Promise<void>;
}

// =============================================================================
// HELPERS
// =============================================================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';

  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function decayDaysRemaining(decayStartedAt: string | null): number | null {
  if (!decayStartedAt) return null;

  const started = new Date(decayStartedAt).getTime();
  const decayPeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const elapsed = Date.now() - started;
  const remaining = Math.ceil((decayPeriodMs - elapsed) / (24 * 60 * 60 * 1000));

  return Math.max(0, remaining);
}

function formatExpiry(expiryStr: string | null): string {
  if (!expiryStr) return 'No expiry';

  const remaining = Math.ceil(
    (new Date(expiryStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );

  if (remaining <= 0) return 'Expired';
  if (remaining === 1) return 'Expires tomorrow';
  return `Expires in ${remaining} days`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MenuSettingsPage({
  items,
  roleLabel,
  syncStatus,
  onReorder,
  onPin,
  onUnpin,
  onRestore,
  onRemove,
  onTriggerSync,
}: MenuSettingsPageProps) {
  const [draggedRef, setDraggedRef] = useState<string | null>(null);
  const [confirmRemoveRef, setConfirmRemoveRef] = useState<string | null>(null);

  // ── Group items by state ──

  const grouped = useMemo(() => {
    const anchors = items
      .filter(i => i.state === 'anchor')
      .sort((a, b) => a.position - b.position);

    const active = items
      .filter(i => i.state === 'active')
      .sort((a, b) => a.position - b.position);

    const decaying = items
      .filter(i => i.state === 'decaying')
      .sort((a, b) => {
        const aRemain = decayDaysRemaining(a.decayStartedAt) ?? 999;
        const bRemain = decayDaysRemaining(b.decayStartedAt) ?? 999;
        return aRemain - bRemain; // Soonest-to-expire first
      });

    const pushed = items.filter(i => i.state === 'pushed');

    const overflow = items
      .filter(i => i.state === 'overflow')
      .sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime; // Most recently used first
      });

    return { anchors, active, decaying, pushed, overflow };
  }, [items]);

  // ── Drag handlers ──

  const handleDragStart = useCallback((ref: string) => {
    setDraggedRef(ref);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetRef: string) => {
    e.preventDefault();
    if (!draggedRef || draggedRef === targetRef) return;

    const target = items.find(i => i.ref === targetRef);
    if (target) {
      onReorder(draggedRef, target.position);
    }
  }, [draggedRef, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedRef(null);
  }, []);

  // ── Remove with confirmation ──

  const handleRemoveClick = useCallback((ref: string) => {
    if (confirmRemoveRef === ref) {
      onRemove(ref);
      setConfirmRemoveRef(null);
    } else {
      setConfirmRemoveRef(ref);
    }
  }, [confirmRemoveRef, onRemove]);

  // ── Section renderer ──

  const renderItem = useCallback((
    item: MenuSettingsItem,
    options: {
      draggable: boolean;
      showPin: boolean;
      showRemove: boolean;
      showRestore: boolean;
      subtitle: string;
      accent?: string;
    },
  ) => {
    const isDragging = draggedRef === item.ref;

    return (
      <div
        key={item.ref}
        className={`menu-settings__item ${isDragging ? 'menu-settings__item--dragging' : ''} ${
          options.accent ? `menu-settings__item--${options.accent}` : ''
        }`}
        draggable={options.draggable}
        onDragStart={options.draggable ? () => handleDragStart(item.ref) : undefined}
        onDragOver={options.draggable ? (e) => handleDragOver(e, item.ref) : undefined}
        onDragEnd={options.draggable ? handleDragEnd : undefined}
        role="listitem"
      >
        {/* Drag handle */}
        {options.draggable && (
          <span className="menu-settings__drag-handle" aria-hidden="true">
            ☰
          </span>
        )}

        {/* Icon + Label */}
        <span className="menu-settings__item-icon" aria-hidden="true">
          {item.icon}
        </span>
        <div className="menu-settings__item-content">
          <span className="menu-settings__item-label">{item.label}</span>
          <span className="menu-settings__item-subtitle">{options.subtitle}</span>
        </div>

        {/* Actions */}
        <div className="menu-settings__item-actions">
          {options.showPin && !item.pinned && (
            <button
              className="menu-settings__action-button"
              onClick={() => onPin(item.ref)}
              aria-label={`Pin ${item.label}`}
              type="button"
            >
              Pin
            </button>
          )}
          {options.showPin && item.pinned && (
            <button
              className="menu-settings__action-button menu-settings__action-button--active"
              onClick={() => onUnpin(item.ref)}
              aria-label={`Unpin ${item.label}`}
              type="button"
            >
              Pinned
            </button>
          )}
          {options.showRestore && (
            <button
              className="menu-settings__action-button menu-settings__action-button--restore"
              onClick={() => onRestore(item.ref)}
              aria-label={`Restore ${item.label} to menu`}
              type="button"
            >
              Restore
            </button>
          )}
          {options.showRemove && (
            <button
              className={`menu-settings__action-button menu-settings__action-button--remove ${
                confirmRemoveRef === item.ref ? 'menu-settings__action-button--confirm' : ''
              }`}
              onClick={() => handleRemoveClick(item.ref)}
              aria-label={
                confirmRemoveRef === item.ref
                  ? `Confirm remove ${item.label}`
                  : `Remove ${item.label}`
              }
              type="button"
            >
              {confirmRemoveRef === item.ref ? 'Confirm?' : '✕'}
            </button>
          )}
        </div>
      </div>
    );
  }, [draggedRef, confirmRemoveRef, handleDragStart, handleDragOver, handleDragEnd, handleRemoveClick, onPin, onUnpin, onRestore]);

  // ── Render ──

  return (
    <div className="menu-settings" role="region" aria-label="Menu Settings">
      {/* Header */}
      <div className="menu-settings__header">
        <div>
          <h1 className="menu-settings__title">Menu Settings</h1>
          <p className="menu-settings__subtitle">
            Manage your {roleLabel} navigation. Drag to reorder, pin to keep,
            or restore items from overflow.
          </p>
        </div>

        {/* Sync status */}
        <div className="menu-settings__sync">
          <button
            className="menu-settings__sync-button"
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
            aria-label={syncStatus.isSyncing ? 'Syncing...' : 'Sync now'}
            type="button"
          >
            <span className={syncStatus.isSyncing ? 'menu-settings__sync-icon--spinning' : ''}>
              ↻
            </span>
            {syncStatus.isSyncing ? 'Syncing...' : 'Sync'}
          </button>
          <span className="menu-settings__sync-status">
            {!syncStatus.isOnline && 'Offline'}
            {syncStatus.isOnline && syncStatus.hasPendingChanges && 'Unsaved changes'}
            {syncStatus.isOnline && !syncStatus.hasPendingChanges && syncStatus.lastSyncResult
              && `v${syncStatus.localVersion}`
            }
          </span>
        </div>
      </div>

      {/* Anchors section */}
      {grouped.anchors.length > 0 && (
        <section className="menu-settings__section">
          <h2 className="menu-settings__section-title">
            Anchors
            <span className="menu-settings__section-count">{grouped.anchors.length}</span>
          </h2>
          <p className="menu-settings__section-description">
            Your core items. These are always visible in your navigation.
          </p>
          <div className="menu-settings__list" role="list">
            {grouped.anchors.map(item =>
              renderItem(item, {
                draggable: true,
                showPin: true,
                showRemove: false, // Anchors can't be removed
                showRestore: false,
                subtitle: `Used ${item.useCount} times · ${timeAgo(item.lastUsed)}`,
              }),
            )}
          </div>
        </section>
      )}

      {/* Active items section */}
      {grouped.active.length > 0 && (
        <section className="menu-settings__section">
          <h2 className="menu-settings__section-title">
            Active Items
            <span className="menu-settings__section-count">{grouped.active.length}</span>
          </h2>
          <p className="menu-settings__section-description">
            Items you use regularly. Pin them to prevent decay.
          </p>
          <div className="menu-settings__list" role="list">
            {grouped.active.map(item =>
              renderItem(item, {
                draggable: true,
                showPin: true,
                showRemove: true,
                showRestore: false,
                subtitle: `Used ${item.useCount} times · Last: ${timeAgo(item.lastUsed)}`,
              }),
            )}
          </div>
        </section>
      )}

      {/* Decaying items section */}
      {grouped.decaying.length > 0 && (
        <section className="menu-settings__section menu-settings__section--decaying">
          <h2 className="menu-settings__section-title">
            Decaying
            <span className="menu-settings__section-count">{grouped.decaying.length}</span>
          </h2>
          <p className="menu-settings__section-description">
            These items haven't been used recently and will move to overflow
            unless pinned or used again.
          </p>
          <div className="menu-settings__list" role="list">
            {grouped.decaying.map(item => {
              const daysLeft = decayDaysRemaining(item.decayStartedAt);
              return renderItem(item, {
                draggable: false,
                showPin: true,
                showRemove: true,
                showRestore: false,
                subtitle: daysLeft !== null
                  ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until overflow · Last: ${timeAgo(item.lastUsed)}`
                  : `Decaying · Last: ${timeAgo(item.lastUsed)}`,
                accent: 'decay',
              });
            })}
          </div>
        </section>
      )}

      {/* Pushed items section */}
      {grouped.pushed.length > 0 && (
        <section className="menu-settings__section menu-settings__section--pushed">
          <h2 className="menu-settings__section-title">
            Required by Your School
            <span className="menu-settings__section-count">{grouped.pushed.length}</span>
          </h2>
          <p className="menu-settings__section-description">
            These items are required by your institution and cannot be removed.
          </p>
          <div className="menu-settings__list" role="list">
            {grouped.pushed.map(item =>
              renderItem(item, {
                draggable: false,
                showPin: false, // Already locked
                showRemove: false, // Can't be removed
                showRestore: false,
                subtitle: `${item.pushReason ?? 'Required'} · ${formatExpiry(item.pushExpiry)}`,
                accent: 'push',
              }),
            )}
          </div>
        </section>
      )}

      {/* Overflow section */}
      {grouped.overflow.length > 0 && (
        <section className="menu-settings__section menu-settings__section--overflow">
          <h2 className="menu-settings__section-title">
            Overflow
            <span className="menu-settings__section-count">{grouped.overflow.length}</span>
          </h2>
          <p className="menu-settings__section-description">
            Items that moved here due to inactivity. Restore them to bring
            them back to your menu.
          </p>
          <div className="menu-settings__list" role="list">
            {grouped.overflow.map(item =>
              renderItem(item, {
                draggable: false,
                showPin: false,
                showRemove: true,
                showRestore: true,
                subtitle: `Last used: ${timeAgo(item.lastUsed)} · Used ${item.useCount} times`,
              }),
            )}
          </div>
        </section>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="menu-settings__empty">
          <p>Your menu will populate as you use the platform.</p>
          <p>Start exploring features to build your personalised navigation.</p>
        </div>
      )}
    </div>
  );
}
