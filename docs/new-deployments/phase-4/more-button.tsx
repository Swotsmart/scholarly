'use client';

// =============================================================================
// MORE BUTTON (Overflow Drawer Trigger)
// =============================================================================
// The trigger button at the bottom of the sidebar that opens the overflow
// drawer. Shows a count badge when overflow items exist. This is the
// "filing cabinet handle" — always visible when there are items to access,
// hidden when the overflow is empty.
//
// Specification references:
//   Section 14.3 — "Accessible via a 'More' button at the bottom of the menu"
// =============================================================================

import React from 'react';

export interface MoreButtonProps {
  /** Number of items in overflow. */
  overflowCount: number;

  /** Whether the overflow drawer is currently open. */
  isOpen: boolean;

  /** Callback when the button is clicked. */
  onClick: () => void;
}

export function MoreButton({ overflowCount, isOpen, onClick }: MoreButtonProps) {
  // Don't render if there are no overflow items
  if (overflowCount === 0) return null;

  return (
    <button
      className="overflow-trigger"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls="overflow-drawer"
      aria-label={`More. ${overflowCount} ${overflowCount === 1 ? 'item' : 'items'} in overflow.`}
      type="button"
    >
      {/* Chevron icon */}
      <span className="overflow-trigger__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="12" cy="8" r="1.5" fill="currentColor" />
        </svg>
      </span>

      {/* Label */}
      <span>More</span>

      {/* Count badge */}
      <span className="overflow-trigger__count" aria-hidden="true">
        {overflowCount}
      </span>
    </button>
  );
}
