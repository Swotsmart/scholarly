'use client';

// =============================================================================
// OVERFLOW DRAWER
// =============================================================================
// The slide-out panel that houses menu items which have decayed past the
// 60-day threshold. Think of it as the filing cabinet beside your desk —
// not on the desk surface (the active menu), but within arm's reach.
//
// Specification references:
//   Section 14.3 — The Overflow Drawer
//   Section 19   — Accessibility (WCAG 2.4.3: focus management)
//   Phase 4      — Decay & Overflow Polish
//
// Key behaviours:
//   - Accessible via "More" button at bottom of sidebar menu
//   - Shows overflow items sorted by most recently used
//   - "Last used X days ago" relative time labels
//   - One-tap restore to ACTIVE state
//   - Maximum 15 items displayed (180-day prune handled by store)
//   - Receives focus on open (WCAG 2.4.3)
//   - Keyboard navigable: Arrow keys traverse items, Enter restores
//   - prefers-reduced-motion: instant open/close, no slide animation
//   - Close on Escape, close on click outside
// =============================================================================

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { getTask } from '@/config/menu-registry';
import type { ComposingMenuItem } from '@/types/composing-menu-types';

// =============================================================================
// TYPES
// =============================================================================

export interface OverflowDrawerProps {
  /** Whether the drawer is open. */
  isOpen: boolean;

  /** Callback to close the drawer. */
  onClose: () => void;

  /** Overflow items from the composing menu store. */
  items: ComposingMenuItem[];

  /** Called when the user restores an item. */
  onRestore: (taskRef: string) => void;

  /** Called when the user navigates to an item's route. */
  onNavigate: (taskRef: string, path: string) => void;

  /** Whether the user prefers reduced motion. */
  reducedMotion: boolean;
}

// =============================================================================
// RELATIVE TIME FORMATTING
// =============================================================================

function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Used today';
  if (diffDays === 1) return 'Used yesterday';
  if (diffDays < 7) return `Used ${diffDays} days ago`;
  if (diffDays < 14) return 'Used last week';
  if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return 'Used last month';
  if (diffDays < 365) return `Used ${Math.floor(diffDays / 30)} months ago`;
  return 'Used over a year ago';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OverflowDrawer({
  isOpen,
  onClose,
  items,
  onRestore,
  onNavigate,
  reducedMotion,
}: OverflowDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  // Sort items by most recently used (spec: Section 14.3)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime; // Most recent first
    });
  }, [items]);

  // ── Focus management (WCAG 2.4.3) ──
  // When drawer opens, save current focus and move focus to the drawer.
  // When drawer closes, restore focus to the previously focused element.

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Slight delay to allow the drawer to render before focusing
      const timeoutId = setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, reducedMotion ? 0 : 150); // Match animation duration

      return () => clearTimeout(timeoutId);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen, reducedMotion]);

  // ── Close on Escape ──

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Close on click outside ──

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener to prevent the opening click from closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ── Focus trap: Tab cycles within drawer ──

  const handleDrawerKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;

    const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0]!;
    const lastElement = focusableElements[focusableElements.length - 1]!;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  // ── Arrow key navigation within item list ──

  const handleItemKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = itemRefs.current[index + 1];
      if (next) next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = itemRefs.current[index - 1];
      if (prev) prev.focus();
    }
  }, []);

  // ── Restore handler ──

  const handleRestore = useCallback((taskRef: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the navigation click
    onRestore(taskRef);
  }, [onRestore]);

  // ── Navigate handler ──

  const handleNavigate = useCallback((taskRef: string) => {
    const task = getTask(taskRef);
    if (!task) return;

    onNavigate(taskRef, task.path);
    onClose();
  }, [onNavigate, onClose]);

  // ── Don't render if closed ──

  if (!isOpen) return null;

  // ── Animation classes ──

  const drawerAnimationClass = reducedMotion
    ? 'overflow-drawer--instant'
    : 'overflow-drawer--animated';

  const backdropAnimationClass = reducedMotion
    ? 'overflow-backdrop--instant'
    : 'overflow-backdrop--animated';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`overflow-backdrop ${backdropAnimationClass}`}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`overflow-drawer ${drawerAnimationClass}`}
        role="dialog"
        aria-modal="true"
        aria-label="Overflow menu items"
        onKeyDown={handleDrawerKeyDown}
      >
        {/* Header */}
        <div className="overflow-drawer__header">
          <h2 className="overflow-drawer__title" id="overflow-drawer-title">
            More
          </h2>
          <span className="overflow-drawer__count">
            {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
          </span>
          <button
            ref={closeButtonRef}
            className="overflow-drawer__close"
            onClick={onClose}
            aria-label="Close overflow drawer"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Item list */}
        {sortedItems.length === 0 ? (
          <div className="overflow-drawer__empty" role="status">
            <p className="overflow-drawer__empty-text">
              No items in overflow. Menu items that haven't been used for 60 days
              will appear here.
            </p>
          </div>
        ) : (
          <ul
            className="overflow-drawer__list"
            role="list"
            aria-labelledby="overflow-drawer-title"
          >
            {sortedItems.map((item, index) => {
              const task = getTask(item.ref);
              const IconComponent = task?.icon;
              const label = task?.label ?? item.ref;
              const relativeTime = formatRelativeTime(item.lastUsed);

              return (
                <li key={item.ref} className="overflow-drawer__item" role="listitem">
                  <button
                    ref={el => { itemRefs.current[index] = el; }}
                    className="overflow-drawer__item-button"
                    onClick={() => handleNavigate(item.ref)}
                    onKeyDown={e => handleItemKeyDown(e, index)}
                    aria-label={`${label}. ${relativeTime}. Press Enter to navigate, or use the restore button.`}
                    type="button"
                  >
                    {/* Icon */}
                    <span className="overflow-drawer__item-icon" aria-hidden="true">
                      {IconComponent && <IconComponent size={18} />}
                    </span>

                    {/* Label + time */}
                    <span className="overflow-drawer__item-content">
                      <span className="overflow-drawer__item-label">{label}</span>
                      <span className="overflow-drawer__item-time">{relativeTime}</span>
                    </span>

                    {/* Restore button */}
                    <button
                      className="overflow-drawer__restore-button"
                      onClick={e => handleRestore(item.ref, e)}
                      aria-label={`Restore ${label} to your menu`}
                      title="Restore to menu"
                      type="button"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M2 8a6 6 0 1 1 1.76 4.24"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                        />
                        <path
                          d="M2 12V8h4"
                          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                      <span className="overflow-drawer__restore-label">Restore</span>
                    </button>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer hint */}
        <div className="overflow-drawer__footer">
          <p className="overflow-drawer__hint">
            Items here haven't been used recently. Restore them to bring them back
            to your menu, or find any feature using <kbd>⌘K</kbd>.
          </p>
        </div>
      </div>
    </>
  );
}
