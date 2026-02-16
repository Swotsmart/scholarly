'use client';

// =============================================================================
// COMPOSING MENU TYPES
// =============================================================================
// Shared type definitions for the self-composing interface.
// These types form the vocabulary that every component in the system speaks.
// =============================================================================

import type { LucideIcon } from 'lucide-react';

// =============================================================================
// MENU ITEM LIFECYCLE STATES
// =============================================================================
// Every menu item exists in exactly one of these states at any given time.
// The state machine transitions are:
//
//   [role config] ──► ANCHOR (permanent)
//   [seed engine] ──► SEED ──► ACTIVE (pin or 2nd use)
//                         ├──► DISMISSED (user rejects, 14-day cooldown)
//   [usage tracking] ──► ACTIVE ──► DECAYING (30d unused)
//                                     ──► OVERFLOW (60d unused)
//   [admin push] ──► PUSHED (institutional requirement)
//   [user action] ──► REMOVED (explicit removal, never auto-restored)
// =============================================================================

export type MenuItemState =
  | 'anchor'     // Permanent. Top of menu. Cannot be removed.
  | 'seed'       // AI-suggested. Visible with sparkle. Pin/dismiss/ignore.
  | 'active'     // In the user's menu. Subject to decay if unused.
  | 'decaying'   // Visually dimmed. 30+ days unused. Pin to save.
  | 'overflow'   // Hidden. 60+ days unused. Accessible via More/Cmd+K.
  | 'pushed'     // Institutionally required. Lock icon. Cannot remove.
  | 'dismissed'  // Seed rejected by user. 14-day cooldown.
  | 'removed';   // Explicitly removed. Never auto-added again.

// =============================================================================
// MENU ITEM
// =============================================================================
// A single item in the composing menu. Carries its lifecycle metadata
// alongside the navigation data needed to render it.
// =============================================================================

export interface ComposingMenuItem {
  /** Unique task reference from the taxonomy (e.g., 'D2', 'T1', 'LF3') */
  ref: string;

  /** Current lifecycle state */
  state: MenuItemState;

  /** When this item entered its current state (ISO 8601) */
  addedAt: string;

  /** Most recent meaningful use (ISO 8601). Null if never used. */
  lastUsed: string | null;

  /** Lifetime count of meaningful uses (5-second threshold) */
  useCount: number;

  /** User-pinned items are exempt from decay */
  pinned: boolean;

  /** Display order within the visible menu (lower = higher) */
  position: number;

  // ── Seed-specific fields ──

  /** Relevance score from the seed engine (0–1). Only present for seeds. */
  seedScore?: number;

  /** Human-readable explanation for why this was suggested */
  seedReason?: string;

  // ── Push-specific fields ──

  /** Admin userId who pushed this item */
  pushedBy?: string;

  /** Explanation shown to user in the lock icon tooltip */
  pushReason?: string;

  /** Optional auto-expiry date (ISO 8601). After this, transitions to ACTIVE. */
  pushExpiry?: string;

  // ── Dismiss-specific ──

  /** When the user dismissed this seed (ISO 8601). Re-eligible after 14 days. */
  dismissedAt?: string;
}

// =============================================================================
// ROLE MENU STATE
// =============================================================================
// The complete menu state for a single user-role combination.
// A user who is both a teacher and a parent has two separate RoleMenuState
// records — one keyed by 'teacher', one by 'parent'.
// =============================================================================

export interface RoleMenuState {
  /** All menu items across all states */
  items: ComposingMenuItem[];

  /** When the seed engine last ran for this role (ISO 8601) */
  lastSeedRun: string;

  /** Incremented on every change. Used for cross-device sync. */
  menuVersion: number;
}

// =============================================================================
// NAVIGATION REGISTRY TYPES
// =============================================================================
// These types define the static registry of all navigable tasks in the platform.
// The registry is the "dictionary" that the composing menu draws from.
// =============================================================================

export type MenuItemType = 'atomic' | 'compound';

export interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface RegisteredTask {
  /** Unique task reference matching the taxonomy (e.g., 'D1', 'T2', 'LF1') */
  ref: string;

  /** Display name shown in the menu */
  name: string;

  /** Primary navigation href */
  href: string;

  /** Lucide icon component */
  icon: LucideIcon;

  /** Atomic (single route) or compound (has children) */
  type: MenuItemType;

  /** Child navigation items for compound menu items (max 4) */
  children?: NavChild[];

  /** Short description shown on hover or in tooltips */
  description?: string;

  /** Which task cluster this belongs to (for analytics and grouping) */
  cluster: string;

  /** Dynamic badge content (e.g., unread count). Computed at render time. */
  badge?: string | number;
}

// =============================================================================
// ANCHOR DEFINITION
// =============================================================================
// Static configuration mapping each role to its permanent anchor items.
// Anchors are defined once and never change for the life of the role.
// =============================================================================

export interface AnchorDefinition {
  /** Task ref from the registry */
  ref: string;

  /** Fixed position in the menu (0 = top) */
  position: number;
}

export interface RoleAnchors {
  /** The role identifier (matches user.role values) */
  role: string;

  /** Alias role identifiers that map to the same anchors */
  aliases: string[];

  /** Ordered list of anchor task refs */
  anchors: AnchorDefinition[];
}

// =============================================================================
// SEED ENGINE TYPES
// =============================================================================
// Context passed to the seed engine when generating suggestions.
// =============================================================================

export interface SeedContext {
  role: string;
  onboarding: {
    interests?: string[];
    subjects?: string[];
    yearLevels?: string[];
    completedSteps: string[];
  };
  temporal: {
    dayOfWeek: number;    // 0 = Sunday, 6 = Saturday
    hour: number;         // 0–23
    termWeek?: number;    // Week within current school term
    isSchoolDay: boolean;
  };
  institution?: {
    hasTimetable: boolean;
    hasAbsences: boolean;
    upcomingEvents: string[];
    pushedItems: string[];
  };
}

// =============================================================================
// TOAST ACTION TYPES
// =============================================================================
// Actions available on promotion toasts.
// =============================================================================

export type PromotionResponse = 'yes' | 'not_now' | 'never';

export interface MenuToastAction {
  type: 'promotion_offer' | 'auto_added' | 'decay_overflow' | 'seed_dismissed' | 'push_received' | 'menu_rearranged';
  taskRef: string;
  taskName: string;
}
