'use client';

// =============================================================================
// USE REDUCED MOTION HOOK
// =============================================================================
// Centralised detection of the prefers-reduced-motion media query. All
// components in the self-composing interface consume this hook to determine
// whether animations should be instant or gradual.
//
// Specification references:
//   Section 19 — Accessibility (WCAG 2.3.3: reduced motion)
//   Phase 2 limitation — "Toast slide-in/out animations play regardless
//                         of prefers-reduced-motion. Phase 4 will add
//                         instant transitions for reduced-motion users."
//
// This hook:
//   - Reads the prefers-reduced-motion media query on mount
//   - Listens for changes (user can toggle system settings mid-session)
//   - Returns a boolean that components use to skip animations
//   - Provides CSS class names for conditional animation application
//
// Usage:
//   const reducedMotion = useReducedMotion();
//   // In JSX: className={reducedMotion ? 'instant' : 'animated'}
// =============================================================================

import { useState, useEffect } from 'react';

// =============================================================================
// MEDIA QUERY CONSTANT
// =============================================================================

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// =============================================================================
// HOOK
// =============================================================================

/**
 * Returns true if the user has enabled reduced motion in their OS settings.
 * Listens for changes and updates reactively.
 *
 * SSR-safe: returns false during server rendering (animations enabled by
 * default, then adjusted on client hydration).
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window.matchMedia is available (SSR guard)
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes (user can toggle reduced motion mid-session)
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// =============================================================================
// ANIMATION DURATION HELPER
// =============================================================================

/**
 * Returns the appropriate animation duration based on reduced motion preference.
 * Components that need programmatic animation timings (e.g., setTimeout for
 * focus delays) use this instead of hardcoding millisecond values.
 */
export function getAnimationDuration(
  normalMs: number,
  reducedMotion: boolean,
): number {
  return reducedMotion ? 0 : normalMs;
}

// =============================================================================
// CSS CLASS HELPER
// =============================================================================

/**
 * Returns a conditional CSS class name based on reduced motion preference.
 * Reduces boilerplate in component className construction.
 *
 * Usage:
 *   className={motionClass(reducedMotion, 'slide-in', 'instant')}
 */
export function motionClass(
  reducedMotion: boolean,
  animatedClass: string,
  instantClass: string,
): string {
  return reducedMotion ? instantClass : animatedClass;
}
