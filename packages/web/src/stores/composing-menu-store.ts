'use client';

// =============================================================================
// COMPOSING MENU STORE
// =============================================================================
// The state machine that powers the self-composing interface. This store
// replaces the original sidebar-store.ts (41 lines) with the full lifecycle
// system specified in the Self-Composing Interface design document.
//
// Phase 1 scope:
//   - Anchor initialisation from role config
//   - Role-keyed menu state (separate menu per role for multi-role users)
//   - Usage tracking (recordUse)
//   - Promotion logic (1st use → toast offer, 2nd use → auto-add)
//   - Pin/unpin, remove, restore actions
//   - Basic decay cycle (30d → decaying, 60d → overflow)
//   - Collapsed/overflow UI state
//   - Backward compatibility: old favorites migrated on first load
//
// Phases 2–6 will extend this store with:
//   - Seed engine integration (Phase 3)
//   - Admin push mechanism (Phase 5)
//   - Cross-device sync (Phase 6)
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAnchorsForRole, getTask } from '@/config/menu-registry';
import type {
  ComposingMenuItem,
  MenuItemState,
  RoleMenuState,
  PromotionResponse,
  SeedContext,
} from '@/types/composing-menu-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const DECAY_THRESHOLD_DAYS = 30;
const OVERFLOW_THRESHOLD_DAYS = 60;
const DISMISS_COOLDOWN_DAYS = 14;
const OVERFLOW_PRUNE_DAYS = 180;
const MAX_OVERFLOW_ITEMS = 15;
const MEANINGFUL_USE_SECONDS = 5;

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface ComposingMenuStore {
  // ── State ──
  roleMenus: Record<string, RoleMenuState>;
  collapsed: boolean;
  overflowOpen: boolean;

  // ── UI Actions ──
  toggleCollapsed: () => void;
  toggleOverflow: () => void;

  // ── Lifecycle Actions ──

  /**
   * Initialise anchors for a role. Idempotent — only runs once per role.
   * Called when the sidebar mounts and a user with a role is present.
   */
  initRole: (role: string) => void;

  /**
   * Record a meaningful use of a task. This drives the promotion system:
   * - 1st use of a non-menu item: returns 'offer' so the sidebar can show a toast
   * - 2nd use: auto-adds to menu, returns 'auto_added'
   * - 3rd+ uses of an active item: updates lastUsed, returns 'updated'
   * - Item is REMOVED: returns 'blocked' (respects user's "Never" choice)
   */
  recordUse: (role: string, taskRef: string) => 'offer' | 'auto_added' | 'updated' | 'blocked' | 'anchor';

  /**
   * Respond to a promotion toast.
   * - 'yes': item → ACTIVE
   * - 'not_now': increment use count only (2nd use will auto-add)
   * - 'never': item → REMOVED
   */
  respondToPromotion: (role: string, taskRef: string, response: PromotionResponse) => void;

  /**
   * Pin an item (prevents decay). Works on ACTIVE, DECAYING, and SEED items.
   * Pinning a SEED promotes it to ACTIVE.
   * Pinning a DECAYING item restores it to ACTIVE.
   */
  pinItem: (role: string, taskRef: string) => void;

  /** Unpin an item (re-enables decay). */
  unpinItem: (role: string, taskRef: string) => void;

  /** Remove an item from the menu. Transitions to REMOVED state. */
  removeItem: (role: string, taskRef: string) => void;

  /** Restore an item from OVERFLOW or REMOVED to ACTIVE. */
  restoreItem: (role: string, taskRef: string) => void;

  /** Reorder visible items by providing refs in desired order. */
  reorderItems: (role: string, orderedRefs: string[]) => void;

  /** Run the decay cycle. Called on session start. */
  runDecayCycle: (role: string) => string[];

  /** Dismiss a seed suggestion. 14-day cooldown before re-eligibility. */
  dismissSeed: (role: string, taskRef: string) => void;

  // ── Seed Engine (Phase 3 placeholder — functional stub) ──

  /**
   * Add seed suggestions to the menu. Called by the seed engine.
   * Seeds are added with state='seed' and rendered with a sparkle indicator.
   */
  addSeeds: (role: string, seeds: Array<{ ref: string; score: number; reason: string }>) => void;

  /** Promote a seed to ACTIVE (equivalent to pinning a seed). */
  promoteSeed: (role: string, taskRef: string) => void;

  // ── Getters ──

  /** Get all visible items for a role (anchors + seeds + active + decaying + pushed). */
  getVisibleItems: (role: string) => ComposingMenuItem[];

  /** Get overflow items for a role. */
  getOverflowItems: (role: string) => ComposingMenuItem[];

  /** Get seed items for a role. */
  getSeedItems: (role: string) => ComposingMenuItem[];

  /** Get a specific item by ref within a role's menu. */
  getItem: (role: string, taskRef: string) => ComposingMenuItem | undefined;

  // ── Migration ──

  /** Migrate old favorites (href strings) to composing menu items. */
  migrateFavorites: (role: string, favoriteHrefs: string[]) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function now(): string {
  return new Date().toISOString();
}

function daysSince(isoDate: string | null): number {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

function ensureRoleMenu(
  roleMenus: Record<string, RoleMenuState>,
  role: string
): RoleMenuState {
  if (roleMenus[role]) return roleMenus[role];
  return { items: [], lastSeedRun: '', menuVersion: 0 };
}

function nextPosition(items: ComposingMenuItem[]): number {
  const visible = items.filter(i =>
    i.state === 'anchor' || i.state === 'seed' || i.state === 'active' ||
    i.state === 'decaying' || i.state === 'pushed'
  );
  if (visible.length === 0) return 0;
  return Math.max(...visible.map(i => i.position)) + 1;
}

/** Resolve the canonical role name (normalises aliases). */
function resolveRole(role: string): string {
  const aliasMap: Record<string, string> = {
    educator: 'teacher',
    student: 'learner',
    guardian: 'parent',
    tutor_professional: 'tutor',
    platform_admin: 'admin',
    homeschool_parent: 'homeschool',
    content_creator: 'creator',
  };
  return aliasMap[role] || role;
}

// =============================================================================
// STORE
// =============================================================================

export const useComposingMenuStore = create<ComposingMenuStore>()(
  persist(
    (set, get) => ({
      roleMenus: {},
      collapsed: false,
      overflowOpen: false,

      // ── UI ──

      toggleCollapsed: () => set(s => ({ collapsed: !s.collapsed })),
      toggleOverflow: () => set(s => ({ overflowOpen: !s.overflowOpen })),

      // ── initRole ──

      initRole: (rawRole: string) => {
        const role = resolveRole(rawRole);
        const state = get();
        const existing = state.roleMenus[role];

        // Already initialised — anchors present
        if (existing && existing.items.some(i => i.state === 'anchor')) return;

        const anchorDef = getAnchorsForRole(role);
        if (!anchorDef) return;

        const anchors: ComposingMenuItem[] = anchorDef.anchors.map(a => ({
          ref: a.ref,
          state: 'anchor' as MenuItemState,
          addedAt: now(),
          lastUsed: null,
          useCount: 0,
          pinned: false, // anchors don't need pinning — they're permanent
          position: a.position,
        }));

        const menu = existing
          ? { ...existing, items: [...anchors, ...existing.items.filter(i => i.state !== 'anchor')] }
          : { items: anchors, lastSeedRun: '', menuVersion: 1 };

        set(s => ({
          roleMenus: { ...s.roleMenus, [role]: menu },
        }));
      },

      // ── recordUse ──

      recordUse: (rawRole: string, taskRef: string) => {
        const role = resolveRole(rawRole);
        const state = get();
        const menu = ensureRoleMenu(state.roleMenus, role);
        const existing = menu.items.find(i => i.ref === taskRef);

        // REMOVED — user said "Never". Respect that.
        if (existing?.state === 'removed') return 'blocked';

        // ANCHOR — always present. Just update usage.
        if (existing?.state === 'anchor') {
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? { ...i, lastUsed: now(), useCount: i.useCount + 1 }
                    : i
                ),
              },
            },
          }));
          return 'anchor';
        }

        // ACTIVE, DECAYING, or PUSHED — update usage, restore if decaying
        if (existing && (existing.state === 'active' || existing.state === 'decaying' || existing.state === 'pushed')) {
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? {
                        ...i,
                        lastUsed: now(),
                        useCount: i.useCount + 1,
                        // Restore from decaying to active on use
                        state: i.state === 'decaying' ? 'active' as MenuItemState : i.state,
                      }
                    : i
                ),
              },
            },
          }));
          return 'updated';
        }

        // SEED — using a seed counts toward promotion
        if (existing?.state === 'seed') {
          const newCount = existing.useCount + 1;
          if (newCount >= 2) {
            // Auto-promote seed on 2nd use
            set(s => ({
              roleMenus: {
                ...s.roleMenus,
                [role]: {
                  ...menu,
                  menuVersion: menu.menuVersion + 1,
                  items: menu.items.map(i =>
                    i.ref === taskRef
                      ? { ...i, state: 'active' as MenuItemState, lastUsed: now(), useCount: newCount, addedAt: now() }
                      : i
                  ),
                },
              },
            }));
            return 'auto_added';
          }
          // First use of seed — update count, offer promotion
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? { ...i, lastUsed: now(), useCount: newCount }
                    : i
                ),
              },
            },
          }));
          return 'offer';
        }

        // OVERFLOW — restore on use
        if (existing?.state === 'overflow') {
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? { ...i, state: 'active' as MenuItemState, lastUsed: now(), useCount: i.useCount + 1, position: nextPosition(menu.items) }
                    : i
                ),
              },
            },
          }));
          return 'auto_added';
        }

        // DISMISSED — check cooldown
        if (existing?.state === 'dismissed') {
          if (existing.dismissedAt && daysSince(existing.dismissedAt) < DISMISS_COOLDOWN_DAYS) {
            // Still in cooldown — silently increment
            set(s => ({
              roleMenus: {
                ...s.roleMenus,
                [role]: {
                  ...menu,
                  items: menu.items.map(i =>
                    i.ref === taskRef ? { ...i, useCount: i.useCount + 1 } : i
                  ),
                },
              },
            }));
            return 'updated';
          }
          // Cooldown expired — treat as first use of new item
        }

        // NOT IN MENU — first encounter with this task
        const useCount = existing ? existing.useCount + 1 : 1;

        if (useCount >= 2) {
          // 2nd use — auto-add
          const newItem: ComposingMenuItem = {
            ref: taskRef,
            state: 'active',
            addedAt: now(),
            lastUsed: now(),
            useCount,
            pinned: false,
            position: nextPosition(menu.items),
          };

          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: [
                  ...menu.items.filter(i => i.ref !== taskRef),
                  newItem,
                ],
              },
            },
          }));
          return 'auto_added';
        }

        // 1st use — record but don't add. Return 'offer' so UI can show toast.
        const tracked: ComposingMenuItem = {
          ref: taskRef,
          state: 'dismissed', // temporary state — not yet in menu
          addedAt: now(),
          lastUsed: now(),
          useCount: 1,
          pinned: false,
          position: -1, // not visible
        };

        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              items: [
                ...menu.items.filter(i => i.ref !== taskRef),
                tracked,
              ],
            },
          },
        }));
        return 'offer';
      },

      // ── respondToPromotion ──

      respondToPromotion: (rawRole, taskRef, response) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);

        if (response === 'yes') {
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? { ...i, state: 'active' as MenuItemState, addedAt: now(), position: nextPosition(menu.items) }
                    : i
                ),
              },
            },
          }));
        } else if (response === 'never') {
          set(s => ({
            roleMenus: {
              ...s.roleMenus,
              [role]: {
                ...menu,
                menuVersion: menu.menuVersion + 1,
                items: menu.items.map(i =>
                  i.ref === taskRef
                    ? { ...i, state: 'removed' as MenuItemState, position: -1 }
                    : i
                ),
              },
            },
          }));
        }
        // 'not_now' — do nothing, use count is already incremented
      },

      // ── pinItem ──

      pinItem: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i => {
                if (i.ref !== taskRef) return i;
                // Pinning a seed or decaying item restores to active
                const newState: MenuItemState =
                  i.state === 'seed' || i.state === 'decaying' ? 'active' : i.state;
                return {
                  ...i,
                  pinned: true,
                  state: newState,
                  position: i.position < 0 ? nextPosition(menu.items) : i.position,
                };
              }),
            },
          },
        }));
      },

      unpinItem: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i =>
                i.ref === taskRef ? { ...i, pinned: false } : i
              ),
            },
          },
        }));
      },

      // ── removeItem ──

      removeItem: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i => {
                if (i.ref !== taskRef) return i;
                // Cannot remove anchors or pushed items
                if (i.state === 'anchor' || i.state === 'pushed') return i;
                return { ...i, state: 'removed' as MenuItemState, position: -1, pinned: false };
              }),
            },
          },
        }));
      },

      // ── restoreItem ──

      restoreItem: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i =>
                i.ref === taskRef
                  ? { ...i, state: 'active' as MenuItemState, lastUsed: now(), position: nextPosition(menu.items) }
                  : i
              ),
            },
          },
        }));
      },

      // ── reorderItems ──

      reorderItems: (rawRole, orderedRefs) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i => {
                const idx = orderedRefs.indexOf(i.ref);
                if (idx === -1) return i;
                return { ...i, position: idx };
              }),
            },
          },
        }));
      },

      // ── runDecayCycle ──

      runDecayCycle: (rawRole) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        const overflowed: string[] = [];

        const updatedItems = menu.items.map(i => {
          // Only ACTIVE and DECAYING items can decay
          if (i.state !== 'active' && i.state !== 'decaying') return i;

          // Pinned items are exempt
          if (i.pinned) return i;

          const unused = daysSince(i.lastUsed);

          // 60+ days → overflow
          if (unused >= OVERFLOW_THRESHOLD_DAYS) {
            overflowed.push(i.ref);
            return { ...i, state: 'overflow' as MenuItemState, position: -1 };
          }

          // 30+ days → decaying
          if (unused >= DECAY_THRESHOLD_DAYS && i.state === 'active') {
            return { ...i, state: 'decaying' as MenuItemState };
          }

          return i;
        });

        // Prune overflow items older than 180 days
        const pruned = updatedItems.filter(i => {
          if (i.state !== 'overflow') return true;
          return daysSince(i.lastUsed) < OVERFLOW_PRUNE_DAYS;
        });

        // Cap overflow at MAX_OVERFLOW_ITEMS (keep most recent)
        const overflowItems = pruned
          .filter(i => i.state === 'overflow')
          .sort((a, b) => {
            const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
            const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
            return bTime - aTime;
          });

        let finalItems = pruned;
        if (overflowItems.length > MAX_OVERFLOW_ITEMS) {
          const keepRefs = new Set(overflowItems.slice(0, MAX_OVERFLOW_ITEMS).map(i => i.ref));
          finalItems = pruned.filter(i => i.state !== 'overflow' || keepRefs.has(i.ref));
        }

        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: finalItems,
            },
          },
        }));

        return overflowed;
      },

      // ── dismissSeed ──

      dismissSeed: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);
        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: menu.items.map(i =>
                i.ref === taskRef
                  ? { ...i, state: 'dismissed' as MenuItemState, dismissedAt: now(), position: -1 }
                  : i
              ),
            },
          },
        }));
      },

      // ── addSeeds ──

      addSeeds: (rawRole, seeds) => {
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);

        // Don't add seeds for items already in menu or removed
        const existingRefs = new Set(menu.items.map(i => i.ref));
        const removedRefs = new Set(
          menu.items.filter(i => i.state === 'removed').map(i => i.ref)
        );

        // Check dismissed cooldown
        const dismissedRefs = new Set(
          menu.items
            .filter(i => i.state === 'dismissed' && i.dismissedAt && daysSince(i.dismissedAt) < DISMISS_COOLDOWN_DAYS)
            .map(i => i.ref)
        );

        const newSeeds: ComposingMenuItem[] = seeds
          .filter(s =>
            !existingRefs.has(s.ref) || // new task
            menu.items.find(i => i.ref === s.ref)?.state === 'overflow' // in overflow is ok
          )
          .filter(s => !removedRefs.has(s.ref)) // respect "Never"
          .filter(s => !dismissedRefs.has(s.ref)) // respect cooldown
          .map((s, idx) => ({
            ref: s.ref,
            state: 'seed' as MenuItemState,
            addedAt: now(),
            lastUsed: null,
            useCount: 0,
            pinned: false,
            position: nextPosition(menu.items) + idx,
            seedScore: s.score,
            seedReason: s.reason,
          }));

        if (newSeeds.length === 0) return;

        // Remove any old seeds before adding new ones
        const withoutOldSeeds = menu.items.filter(i => i.state !== 'seed');

        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              lastSeedRun: now(),
              items: [...withoutOldSeeds, ...newSeeds],
            },
          },
        }));
      },

      // ── promoteSeed ──

      promoteSeed: (rawRole, taskRef) => {
        get().pinItem(rawRole, taskRef); // pinning a seed promotes it
      },

      // ── Getters ──

      getVisibleItems: (rawRole) => {
        const role = resolveRole(rawRole);
        const menu = get().roleMenus[role];
        if (!menu) return [];

        return menu.items
          .filter(i =>
            i.state === 'anchor' ||
            i.state === 'seed' ||
            i.state === 'active' ||
            i.state === 'decaying' ||
            i.state === 'pushed'
          )
          .sort((a, b) => {
            // Anchors first, then by position
            if (a.state === 'anchor' && b.state !== 'anchor') return -1;
            if (b.state === 'anchor' && a.state !== 'anchor') return 1;
            return a.position - b.position;
          });
      },

      getOverflowItems: (rawRole) => {
        const role = resolveRole(rawRole);
        const menu = get().roleMenus[role];
        if (!menu) return [];

        return menu.items
          .filter(i => i.state === 'overflow')
          .sort((a, b) => {
            const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
            const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
            return bTime - aTime; // most recent first
          });
      },

      getSeedItems: (rawRole) => {
        const role = resolveRole(rawRole);
        const menu = get().roleMenus[role];
        if (!menu) return [];
        return menu.items.filter(i => i.state === 'seed').sort((a, b) => (b.seedScore ?? 0) - (a.seedScore ?? 0));
      },

      getItem: (rawRole, taskRef) => {
        const role = resolveRole(rawRole);
        const menu = get().roleMenus[role];
        if (!menu) return undefined;
        return menu.items.find(i => i.ref === taskRef);
      },

      // ── Migration ──

      migrateFavorites: (rawRole, favoriteHrefs) => {
        if (favoriteHrefs.length === 0) return;
        const role = resolveRole(rawRole);
        const menu = ensureRoleMenu(get().roleMenus, role);

        // Find tasks matching the old favorite hrefs
        const { findTaskByPath } = require('@/config/menu-registry');
        const migratedRefs = new Set<string>();

        favoriteHrefs.forEach(href => {
          const task = findTaskByPath(href);
          if (task && !menu.items.some(i => i.ref === task.ref)) {
            migratedRefs.add(task.ref);
          }
        });

        if (migratedRefs.size === 0) return;

        const migrated: ComposingMenuItem[] = Array.from(migratedRefs).map((ref, idx) => ({
          ref,
          state: 'active' as MenuItemState,
          addedAt: now(),
          lastUsed: now(),
          useCount: 1,
          pinned: true, // migrated favorites become pinned active items
          position: nextPosition(menu.items) + idx,
        }));

        set(s => ({
          roleMenus: {
            ...s.roleMenus,
            [role]: {
              ...menu,
              menuVersion: menu.menuVersion + 1,
              items: [...menu.items, ...migrated],
            },
          },
        }));
      },
    }),
    {
      name: 'scholarly-composing-menu',
      version: 1,
    }
  )
);

// =============================================================================
// BACKWARD COMPATIBILITY EXPORT
// =============================================================================
// The old sidebar-store.ts exported useSidebarStore. Components that haven't
// been migrated yet can import from here with the same API shape.
// This shim reads from the new store and maps to the old interface.
// =============================================================================

export const useSidebarStore = () => {
  const store = useComposingMenuStore();
  return {
    collapsed: store.collapsed,
    toggleCollapsed: store.toggleCollapsed,
    // Favorites are now managed through the composing menu system.
    // This returns an empty array — the migration runs once on mount.
    favorites: [] as string[],
    toggleFavorite: (_href: string) => {
      // No-op in the new system. Items are added via recordUse/promotion.
    },
    showAdvanced: false,
    toggleAdvanced: () => {
      // Advanced sections no longer exist. Items surface through the composing menu.
    },
  };
};
