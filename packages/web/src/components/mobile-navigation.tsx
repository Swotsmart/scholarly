'use client';

// =============================================================================
// MOBILE NAVIGATION ADAPTATION
// =============================================================================
// The self-composing interface was designed desktop-first (sidebar). This
// file adapts it for mobile screens with three components:
//
//   1. MobileBottomTabs — Fixed bottom tab bar showing anchor items
//      (the user's 4–5 most important tasks). Always visible, just like
//      the anchor section in the desktop sidebar.
//
//   2. MobileMenuSheet — Hamburger-activated bottom sheet showing the
//      growth section (active + seeded items) and overflow access.
//      This replaces the desktop sidebar's scrollable area on mobile.
//
//   3. MobileSeedCards — Seed suggestions rendered as swipeable cards
//      on the mobile dashboard rather than in the sidebar, since
//      mobile sidebar space is too constrained for seed items.
//
// Think of the desktop sidebar as a filing cabinet beside your desk.
// On mobile, we split that cabinet into three pieces: the top drawer
// (most used tools) sits on your belt (bottom tabs), the middle drawers
// become a pull-out tray (hamburger sheet), and the suggestion cards
// become notes pinned to your dashboard.
//
// Specification references:
//   Phase 6 plan — "Mobile navigation adaptation: 2–3 days —
//                    Bottom tab bar shows anchor items. Overflow accessible
//                    via hamburger menu. Seed suggestions appear as cards
//                    on dashboard."
//   Phase 1 limitation — "No mobile adaptation"
//   Phase 2 limitation — "No mobile toast positioning"
//   Phase 4 limitation — "No mobile drawer positioning"
//
// Integration points:
//   - composing-menu-store.ts (Phase 1): getAnchorItems, getGrowthItems,
//     getOverflowItems, getSeedItems, recordUse
//   - use-menu-toast.ts (Phase 2): toast positioning override
//   - decay-overflow components (Phase 4): OverflowDrawer as bottom sheet
//   - push-client-reception.tsx (Phase 5): PushedItemWrapper
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Menu item shape consumed by mobile components.
 * Subset of the full MenuItemState from Phase 1.
 */
export interface MobileMenuItem {
  ref: string;
  label: string;
  icon: string;
  path: string;
  state: 'anchor' | 'active' | 'seeded' | 'decaying' | 'overflow' | 'pushed' | 'removed';
  pinned: boolean;
  badge?: number;
  pushReason?: string;
  seedScore?: number;
}

export interface MobileBottomTabsProps {
  /** Anchor items from the composing store (max 5 for mobile). */
  items: MobileMenuItem[];

  /** Pushed items that should appear alongside anchors. */
  pushedItems: MobileMenuItem[];

  /** The currently active route path. */
  activePath: string;

  /** Navigation handler. */
  onNavigate: (path: string) => void;

  /** Handler to record usage for the composing store. */
  onRecordUse: (ref: string) => void;

  /** Whether to show the hamburger button (opens MobileMenuSheet). */
  showHamburger: boolean;

  /** Handler for hamburger button press. */
  onHamburgerPress: () => void;
}

export interface MobileMenuSheetProps {
  /** Whether the sheet is currently open. */
  isOpen: boolean;

  /** Handler to close the sheet. */
  onClose: () => void;

  /** Growth section items (active + seeded). */
  growthItems: MobileMenuItem[];

  /** Overflow items accessible via "More" section. */
  overflowItems: MobileMenuItem[];

  /** Navigation handler. */
  onNavigate: (path: string) => void;

  /** Record usage when an item is tapped. */
  onRecordUse: (ref: string) => void;

  /** Pin/unpin handler. */
  onTogglePin: (ref: string, pinned: boolean) => void;

  /** Restore from overflow handler. */
  onRestore: (ref: string) => void;

  /** The currently active route path. */
  activePath: string;
}

export interface MobileSeedCardsProps {
  /** Seed suggestions from the composing store. */
  seeds: MobileMenuItem[];

  /** Accept a seed (promote to active). */
  onAccept: (ref: string) => void;

  /** Dismiss a seed (remove from suggestions). */
  onDismiss: (ref: string) => void;

  /** Navigate to the seeded item. */
  onNavigate: (path: string) => void;
}

// =============================================================================
// 1. MOBILE BOTTOM TABS
// =============================================================================

/**
 * Fixed bottom tab bar for mobile devices. Shows the user's anchor items
 * (their 4–5 most essential tasks) plus a hamburger button for accessing
 * the full menu.
 *
 * The tab bar mirrors the anchor section of the desktop sidebar — these
 * are the items the user has earned through consistent usage. Pushed items
 * from Phase 5 also appear here (with the lock icon).
 *
 * Per the spec, role-specific defaults:
 *   Learner: Home, Learn, AI Buddy, Profile
 *   Teacher: Home, Classes, Grading, Students
 *   Parent:  Home, Children, Messages, Progress
 *   Tutor:   Home, Sessions, Students, Earnings
 *   Admin:   Home, Users, Reports, Settings
 */
export function MobileBottomTabs({
  items,
  pushedItems,
  activePath,
  onNavigate,
  onRecordUse,
  showHamburger,
  onHamburgerPress,
}: MobileBottomTabsProps) {
  // Combine anchors + pushed, limit to 4 (or 3 if hamburger is shown)
  const maxTabs = showHamburger ? 3 : 4;

  const visibleItems = useMemo(() => {
    // Pushed items take priority (institutional requirement)
    const combined = [...pushedItems, ...items];
    const seen = new Set<string>();
    const deduped: MobileMenuItem[] = [];

    for (const item of combined) {
      if (!seen.has(item.ref) && deduped.length < maxTabs) {
        seen.add(item.ref);
        deduped.push(item);
      }
    }

    return deduped;
  }, [items, pushedItems, maxTabs]);

  const handleTabPress = useCallback((item: MobileMenuItem) => {
    onRecordUse(item.ref);
    onNavigate(item.path);
  }, [onNavigate, onRecordUse]);

  return (
    <nav
      className="mobile-bottom-tabs"
      role="navigation"
      aria-label="Main navigation"
    >
      {visibleItems.map(item => {
        const isActive = activePath.startsWith(item.path);

        return (
          <button
            key={item.ref}
            className={`mobile-bottom-tabs__tab ${
              isActive ? 'mobile-bottom-tabs__tab--active' : ''
            } ${item.state === 'pushed' ? 'mobile-bottom-tabs__tab--pushed' : ''}`}
            onClick={() => handleTabPress(item)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={
              item.state === 'pushed'
                ? `${item.label} (required by your school)`
                : item.label
            }
            type="button"
          >
            <span className="mobile-bottom-tabs__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mobile-bottom-tabs__label">
              {item.label}
            </span>
            {item.badge != null && item.badge > 0 && (
              <span
                className="mobile-bottom-tabs__badge"
                aria-label={`${item.badge} notification${item.badge > 1 ? 's' : ''}`}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            {item.state === 'pushed' && (
              <span className="mobile-bottom-tabs__lock" aria-hidden="true">
                🔒
              </span>
            )}
          </button>
        );
      })}

      {showHamburger && (
        <button
          className="mobile-bottom-tabs__tab mobile-bottom-tabs__tab--hamburger"
          onClick={onHamburgerPress}
          aria-label="Open full menu"
          aria-expanded={false}
          type="button"
        >
          <span className="mobile-bottom-tabs__icon" aria-hidden="true">☰</span>
          <span className="mobile-bottom-tabs__label">More</span>
        </button>
      )}
    </nav>
  );
}

// =============================================================================
// 2. MOBILE MENU SHEET
// =============================================================================

/**
 * Bottom sheet that slides up when the hamburger button is pressed.
 * Shows the growth section (active items the user has earned) and
 * overflow access (items that have decayed out of the main menu).
 *
 * This replaces the desktop sidebar's scrollable middle section on mobile.
 * The sheet uses a bottom-sheet pattern (common on mobile) rather than the
 * side-drawer pattern used on desktop, resolving the Phase 4 limitation
 * "No mobile drawer positioning."
 */
export function MobileMenuSheet({
  isOpen,
  onClose,
  growthItems,
  overflowItems,
  onNavigate,
  onRecordUse,
  onTogglePin,
  onRestore,
  activePath,
}: MobileMenuSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [showOverflow, setShowOverflow] = useState(false);

  // Focus trap: focus the sheet when it opens
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemPress = useCallback((item: MobileMenuItem) => {
    onRecordUse(item.ref);
    onNavigate(item.path);
    onClose();
  }, [onNavigate, onRecordUse, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="mobile-menu-sheet__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="mobile-menu-sheet"
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Drag handle */}
        <div className="mobile-menu-sheet__handle" aria-hidden="true">
          <div className="mobile-menu-sheet__handle-bar" />
        </div>

        {/* Growth section */}
        <div className="mobile-menu-sheet__section">
          <h3 className="mobile-menu-sheet__section-title">Your Menu</h3>
          {growthItems.length === 0 ? (
            <p className="mobile-menu-sheet__empty">
              Use features to build your personalised menu.
            </p>
          ) : (
            <ul className="mobile-menu-sheet__list" role="list">
              {growthItems.map(item => {
                const isActive = activePath.startsWith(item.path);

                return (
                  <li key={item.ref} className="mobile-menu-sheet__item">
                    <button
                      className={`mobile-menu-sheet__item-button ${
                        isActive ? 'mobile-menu-sheet__item-button--active' : ''
                      } ${item.state === 'decaying' ? 'mobile-menu-sheet__item-button--decaying' : ''
                      } ${item.state === 'pushed' ? 'mobile-menu-sheet__item-button--pushed' : ''}`}
                      onClick={() => handleItemPress(item)}
                      type="button"
                    >
                      <span className="mobile-menu-sheet__item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="mobile-menu-sheet__item-label">
                        {item.label}
                      </span>
                      {item.state === 'pushed' && (
                        <span className="mobile-menu-sheet__lock" aria-hidden="true">
                          🔒
                        </span>
                      )}
                      {item.state === 'seeded' && (
                        <span className="mobile-menu-sheet__sparkle" aria-hidden="true">
                          ✨
                        </span>
                      )}
                    </button>

                    {/* Pin toggle (not for pushed or seeded items) */}
                    {item.state !== 'pushed' && item.state !== 'seeded' && (
                      <button
                        className={`mobile-menu-sheet__pin ${
                          item.pinned ? 'mobile-menu-sheet__pin--active' : ''
                        }`}
                        onClick={() => onTogglePin(item.ref, !item.pinned)}
                        aria-label={item.pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                        type="button"
                      >
                        📌
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Overflow section */}
        {overflowItems.length > 0 && (
          <div className="mobile-menu-sheet__section">
            <button
              className="mobile-menu-sheet__overflow-toggle"
              onClick={() => setShowOverflow(!showOverflow)}
              aria-expanded={showOverflow}
              type="button"
            >
              <span>Previously Used ({overflowItems.length})</span>
              <span aria-hidden="true">{showOverflow ? '▲' : '▼'}</span>
            </button>

            {showOverflow && (
              <ul className="mobile-menu-sheet__list" role="list">
                {overflowItems.map(item => (
                  <li key={item.ref} className="mobile-menu-sheet__item mobile-menu-sheet__item--overflow">
                    <button
                      className="mobile-menu-sheet__item-button mobile-menu-sheet__item-button--overflow"
                      onClick={() => handleItemPress(item)}
                      type="button"
                    >
                      <span className="mobile-menu-sheet__item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="mobile-menu-sheet__item-label">
                        {item.label}
                      </span>
                    </button>
                    <button
                      className="mobile-menu-sheet__restore"
                      onClick={() => onRestore(item.ref)}
                      aria-label={`Restore ${item.label} to menu`}
                      type="button"
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Settings link */}
        <div className="mobile-menu-sheet__footer">
          <button
            className="mobile-menu-sheet__settings-link"
            onClick={() => { onNavigate('/settings/menu'); onClose(); }}
            type="button"
          >
            Menu Settings →
          </button>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// 3. MOBILE SEED CARDS
// =============================================================================

/**
 * Seed suggestions rendered as cards on the mobile dashboard.
 *
 * On desktop, seeds appear in the sidebar's "Suggested for you" section.
 * On mobile, sidebar space is too precious for suggestions, so they
 * appear as horizontally scrollable cards on the dashboard instead.
 *
 * Each card shows the task icon, name, and a brief reason for the
 * suggestion. Accept adds the item to the menu; dismiss removes it.
 */
export function MobileSeedCards({
  seeds,
  onAccept,
  onDismiss,
  onNavigate,
}: MobileSeedCardsProps) {
  if (seeds.length === 0) return null;

  return (
    <section
      className="mobile-seed-cards"
      aria-label="Suggested for you"
    >
      <h3 className="mobile-seed-cards__title">Suggested for You</h3>

      <div className="mobile-seed-cards__scroll" role="list">
        {seeds.map(seed => (
          <div
            key={seed.ref}
            className="mobile-seed-cards__card"
            role="listitem"
          >
            <div className="mobile-seed-cards__card-header">
              <span className="mobile-seed-cards__card-icon" aria-hidden="true">
                {seed.icon}
              </span>
              <span className="mobile-seed-cards__card-sparkle" aria-hidden="true">
                ✨
              </span>
            </div>

            <h4 className="mobile-seed-cards__card-title">{seed.label}</h4>

            <div className="mobile-seed-cards__card-actions">
              <button
                className="mobile-seed-cards__accept"
                onClick={() => {
                  onAccept(seed.ref);
                  onNavigate(seed.path);
                }}
                aria-label={`Add ${seed.label} to your menu`}
                type="button"
              >
                Add to Menu
              </button>
              <button
                className="mobile-seed-cards__dismiss"
                onClick={() => onDismiss(seed.ref)}
                aria-label={`Dismiss ${seed.label} suggestion`}
                type="button"
              >
                Not Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// 4. MOBILE TOAST POSITION ADAPTER
// =============================================================================

/**
 * Utility hook that overrides toast positioning on mobile.
 *
 * Phase 2's toast system renders at bottom-right (desktop pattern).
 * On mobile, toasts should appear bottom-center to avoid overlap with
 * the bottom tab bar and to be thumb-reachable.
 *
 * This resolves the Phase 2 known limitation:
 *   "No mobile toast positioning — Toasts render at bottom-right
 *    (desktop pattern). Mobile should use bottom-center."
 */
export function useMobileToastPosition(): {
  isMobile: boolean;
  toastPosition: 'bottom-right' | 'bottom-center';
  toastBottomOffset: number;
} {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return {
    isMobile,
    toastPosition: isMobile ? 'bottom-center' : 'bottom-right',
    // Bottom tab bar is 64px + 16px safe area = 80px offset on mobile
    toastBottomOffset: isMobile ? 80 : 16,
  };
}
