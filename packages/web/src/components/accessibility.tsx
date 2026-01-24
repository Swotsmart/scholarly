'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Screen Reader Only Content
// ============================================================================

interface VisuallyHiddenProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Visually hidden content that remains accessible to screen readers
 */
export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        '[clip:rect(0,0,0,0)]',
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================================================
// Skip Link for Keyboard Navigation
// ============================================================================

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
}

/**
 * Skip link for keyboard users to bypass navigation
 */
export function SkipLink({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'fixed top-0 left-0 z-[9999] p-4 bg-background text-foreground',
        'transform -translate-y-full focus:translate-y-0',
        'transition-transform duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      {children}
    </a>
  );
}

// ============================================================================
// Live Region for Dynamic Announcements
// ============================================================================

type AriaLiveValue = 'polite' | 'assertive' | 'off';

interface LiveRegionProps {
  message: string;
  level?: AriaLiveValue;
  atomic?: boolean;
  className?: string;
}

/**
 * Announces dynamic content changes to screen readers
 */
export function LiveRegion({
  message,
  level = 'polite',
  atomic = true,
  className,
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Clear and re-announce to ensure screen readers pick up the change
    setAnnouncement('');
    const timer = setTimeout(() => {
      setAnnouncement(message);
    }, 100);

    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live={level}
      aria-atomic={atomic}
      className={cn(
        'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        '[clip:rect(0,0,0,0)]',
        className
      )}
    >
      {announcement}
    </div>
  );
}

// ============================================================================
// Focus Trap
// ============================================================================

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: boolean;
  className?: string;
}

/**
 * Traps focus within a container (for modals, dialogs)
 */
export function FocusTrap({
  children,
  active = true,
  initialFocus,
  returnFocus = true,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (containerRef.current) {
      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    return () => {
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, initialFocus, returnFocus]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(containerRef.current!);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

// ============================================================================
// Accessible Icon Button
// ============================================================================

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Icon button with proper accessibility
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = 'md', className, ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center rounded-md',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon}
        <VisuallyHidden>{label}</VisuallyHidden>
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';

// ============================================================================
// Reduced Motion Hook
// ============================================================================

/**
 * Detects user's reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// Focus Management Hook
// ============================================================================

/**
 * Manages focus for complex components
 */
export function useFocusManager(containerRef: React.RefObject<HTMLElement>) {
  const focusFirst = () => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    focusable[0]?.focus();
  };

  const focusLast = () => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    focusable[focusable.length - 1]?.focus();
  };

  const focusNext = () => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusable.length;
    focusable[nextIndex]?.focus();
  };

  const focusPrevious = () => {
    if (!containerRef.current) return;
    const focusable = getFocusableElements(containerRef.current);
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
    focusable[prevIndex]?.focus();
  };

  return { focusFirst, focusLast, focusNext, focusPrevious };
}

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================

interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
}

/**
 * Common keyboard navigation patterns
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          options.onEscape?.();
          break;
        case 'Enter':
          options.onEnter?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          options.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          options.onArrowDown?.();
          break;
        case 'ArrowLeft':
          options.onArrowLeft?.();
          break;
        case 'ArrowRight':
          options.onArrowRight?.();
          break;
        case 'Home':
          e.preventDefault();
          options.onHome?.();
          break;
        case 'End':
          e.preventDefault();
          options.onEnd?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}

// ============================================================================
// Roving Tab Index Hook
// ============================================================================

/**
 * Implements roving tab index for composite widgets
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: React.RefObject<T>[],
  options: { loop?: boolean; orientation?: 'horizontal' | 'vertical' } = {}
) {
  const { loop = true, orientation = 'horizontal' } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const navigateKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  const reverseKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isNavigate = e.key === navigateKey;
      const isReverse = e.key === reverseKey;

      if (!isNavigate && !isReverse) return;

      e.preventDefault();

      setFocusedIndex((current) => {
        let next: number;
        if (isNavigate) {
          next = current + 1;
          if (next >= items.length) {
            next = loop ? 0 : items.length - 1;
          }
        } else {
          next = current - 1;
          if (next < 0) {
            next = loop ? items.length - 1 : 0;
          }
        }
        items[next]?.current?.focus();
        return next;
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, loop, navigateKey, reverseKey]);

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex: (index: number) => (index === focusedIndex ? 0 : -1),
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  VisuallyHidden,
  SkipLink,
  LiveRegion,
  FocusTrap,
  IconButton,
  useReducedMotion,
  useFocusManager,
  useKeyboardNavigation,
  useRovingTabIndex,
};
