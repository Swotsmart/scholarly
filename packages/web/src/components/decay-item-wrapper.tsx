'use client';

// =============================================================================
// DECAY ITEM WRAPPER
// =============================================================================
// A wrapper component that applies decay-specific visual treatment to menu
// items in the DECAYING state. Think of it as a visual wilting indicator —
// the item is still alive and functional, but it's visually communicating
// that it needs attention (use it or pin it) before it moves to overflow.
//
// Specification references:
//   Section 14.1 — The Decay Timeline (30d → decaying, 60d → overflow)
//   Section 14.2 — Decay Exemptions (pinned items exempt)
//   Section 19   — Accessibility (WCAG 2.3.3: reduced motion)
//
// Visual treatment (from spec):
//   - 60% opacity on the item container
//   - Dotted underline on the label text
//   - Tooltip: "Pin to keep, or moves to More in N days"
//   - Hover: shows days remaining and pin action
//   - prefers-reduced-motion: no fade transitions, instant state changes
//
// This component does NOT handle the state transitions themselves — those
// remain in the composing menu store (runDecayCycle). This is purely the
// visual presentation layer.
// =============================================================================

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface DecayItemWrapperProps {
  /** The task reference (for identification). */
  taskRef: string;

  /** The item's label text. */
  label: string;

  /** ISO timestamp of last use. */
  lastUsed: string;

  /** Whether the item is pinned (exempt from decay). */
  pinned: boolean;

  /** Whether the user prefers reduced motion. */
  reducedMotion: boolean;

  /** Callback when the user pins/unpins the item. */
  onPinToggle: (taskRef: string) => void;

  /** The child elements (the actual menu item content). */
  children: React.ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DECAY_THRESHOLD_DAYS = 30;
const OVERFLOW_THRESHOLD_DAYS = 60;

// =============================================================================
// HELPERS
// =============================================================================

function daysSince(isoDate: string): number {
  const now = new Date();
  const then = new Date(isoDate);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntilOverflow(lastUsed: string): number {
  const unusedDays = daysSince(lastUsed);
  return Math.max(0, OVERFLOW_THRESHOLD_DAYS - unusedDays);
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DecayItemWrapper({
  taskRef,
  label,
  lastUsed,
  pinned,
  reducedMotion,
  onPinToggle,
  children,
}: DecayItemWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const daysRemaining = useMemo(() => daysUntilOverflow(lastUsed), [lastUsed]);
  const unusedDays = useMemo(() => daysSince(lastUsed), [lastUsed]);

  // Tooltip text per spec: "Pin to keep, or moves to More in N days"
  const tooltipText = useMemo(() => {
    if (pinned) return 'Pinned — this item won\'t move to overflow';
    if (daysRemaining <= 0) return 'Moving to More soon';
    if (daysRemaining === 1) return 'Pin to keep, or moves to More tomorrow';
    return `Pin to keep, or moves to More in ${daysRemaining} days`;
  }, [daysRemaining, pinned]);

  // Show tooltip on hover with a short delay to avoid flashing
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400); // 400ms delay before tooltip appears
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
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

  // Handle pin toggle
  const handlePinClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onPinToggle(taskRef);
  }, [taskRef, onPinToggle]);

  // Handle keyboard pin toggle (Enter or Space on the pin button)
  const handlePinKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onPinToggle(taskRef);
    }
  }, [taskRef, onPinToggle]);

  // ── CSS classes ──

  const wrapperClasses = [
    'decay-item-wrapper',
    pinned ? 'decay-item-wrapper--pinned' : 'decay-item-wrapper--decaying',
    isHovered ? 'decay-item-wrapper--hovered' : '',
    reducedMotion ? 'decay-item-wrapper--no-motion' : '',
  ].filter(Boolean).join(' ');

  // ── Urgency indicator (colour shifts as deadline approaches) ──

  const urgencyLevel = useMemo((): 'low' | 'medium' | 'high' => {
    if (pinned) return 'low';
    if (daysRemaining <= 7) return 'high';
    if (daysRemaining <= 15) return 'medium';
    return 'low';
  }, [daysRemaining, pinned]);

  return (
    <div
      className={wrapperClasses}
      data-decay-urgency={urgencyLevel}
      data-task-ref={taskRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // ARIA: announce the decaying state for screen readers
      aria-label={`${label}. ${pinned ? 'Pinned.' : `Unused for ${unusedDays} days. ${tooltipText}.`}`}
    >
      {/* The actual menu item content */}
      <div className="decay-item-wrapper__content">
        {children}
      </div>

      {/* Decay timer indicator (visible on hover or focus-within) */}
      {!pinned && (
        <div
          className={`decay-item-wrapper__timer ${isHovered ? 'decay-item-wrapper__timer--visible' : ''}`}
          aria-hidden="true"
        >
          <span className="decay-item-wrapper__days-remaining">
            {daysRemaining}d
          </span>
        </div>
      )}

      {/* Pin button (visible on hover or focus-within) */}
      <button
        className={`decay-item-wrapper__pin-button ${isHovered ? 'decay-item-wrapper__pin-button--visible' : ''}`}
        onClick={handlePinClick}
        onKeyDown={handlePinKeyDown}
        aria-label={pinned ? `Unpin ${label}` : `Pin ${label} to keep in menu`}
        title={pinned ? 'Unpin' : 'Pin to keep'}
        type="button"
        tabIndex={0}
      >
        {pinned ? (
          // Filled pin icon (pinned state)
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
            <path d="M9.828 1.172a1 1 0 0 0-1.414 0L6.05 3.536 3.586 5.95a1 1 0 0 0 0 1.414l3.05 3.05a1 1 0 0 0 1.414 0l2.414-2.464 2.364-2.364a1 1 0 0 0 0-1.414L9.828 1.172zM5 9l-3.5 3.5" />
          </svg>
        ) : (
          // Outline pin icon (unpinned state)
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M9.828 1.172a1 1 0 0 0-1.414 0L6.05 3.536 3.586 5.95a1 1 0 0 0 0 1.414l3.05 3.05a1 1 0 0 0 1.414 0l2.414-2.464 2.364-2.364a1 1 0 0 0 0-1.414L9.828 1.172zM5 9l-3.5 3.5"
              stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="decay-item-wrapper__tooltip"
          role="tooltip"
          id={`decay-tooltip-${taskRef}`}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}
