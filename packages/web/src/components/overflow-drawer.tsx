'use client';

// =============================================================================
// OVERFLOW DRAWER
// =============================================================================
// Slide-out panel for menu items that have decayed past the 60-day threshold.
// Built on the Shadcn Sheet (Radix Dialog) component for accessible modal
// behavior: focus trapping, Escape to close, click-outside to close.
//
// Specification references:
//   Section 14.3 -- The Overflow Drawer
//   Section 19   -- Accessibility (WCAG 2.4.3: focus management)
//   Phase 4      -- Decay & Overflow Polish
//
// Key behaviours:
//   - Accessible via "More" button at bottom of sidebar menu
//   - Shows overflow items sorted by most recently used
//   - "Last used X days ago" relative time labels
//   - One-tap restore to ACTIVE state
//   - Maximum 15 items displayed (180-day prune handled by store)
//   - Sheet handles focus on open/close (WCAG 2.4.3)
//   - Keyboard navigable: Arrow keys traverse items, Enter restores
//   - motion-safe Tailwind classes for animation control
// =============================================================================

import { useCallback, useMemo, useRef, type KeyboardEvent } from 'react';
import { RotateCcw, X, MoreHorizontal, Command } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTask } from '@/config/menu-registry';
import type { ComposingMenuItem } from '@/types/composing-menu-types';

// =============================================================================
// TYPES
// =============================================================================

export interface OverflowDrawerProps {
  /** Whether the drawer is open. Controlled by parent. */
  isOpen: boolean;

  /** Callback when open state changes (close on overlay click, Escape, X). */
  onOpenChange: (open: boolean) => void;

  /** Overflow items from the composing menu store. */
  items: ComposingMenuItem[];

  /** Called when the user restores an item to their active menu. */
  onRestore: (taskRef: string) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_ITEMS = 15;

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
  onOpenChange,
  items,
  onRestore,
}: OverflowDrawerProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Sort items by most recently used, cap at MAX_ITEMS
  const sortedItems = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, MAX_ITEMS);
  }, [items]);

  // Arrow key navigation within item list
  const handleItemKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = itemRefs.current[index + 1];
        if (next) next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = itemRefs.current[index - 1];
        if (prev) prev.focus();
      }
    },
    []
  );

  // Restore handler
  const handleRestore = useCallback(
    (taskRef: string) => {
      onRestore(taskRef);
    },
    [onRestore]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex w-80 flex-col p-0 sm:max-w-sm',
          'motion-safe:data-[state=open]:duration-300',
          'motion-safe:data-[state=closed]:duration-200',
          'motion-reduce:duration-0'
        )}
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MoreHorizontal
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <SheetTitle className="text-base font-semibold">More</SheetTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {sortedItems.length}{' '}
                {sortedItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Menu items that have not been used recently. Restore them to bring
            them back to your active menu.
          </SheetDescription>
        </SheetHeader>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {sortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="status">
              <MoreHorizontal
                className="mb-3 h-10 w-10 text-muted-foreground/40"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                No items in overflow. Menu items that haven&apos;t been used for
                60 days will appear here.
              </p>
            </div>
          ) : (
            <ul
              className="flex flex-col gap-0.5 p-2"
              role="list"
              aria-label="Overflow menu items"
            >
              {sortedItems.map((item, index) => {
                const task = getTask(item.ref);
                const IconComponent = task?.icon;
                const label = task?.name ?? item.ref;
                const relativeTime = item.lastUsed
                  ? formatRelativeTime(item.lastUsed)
                  : 'Never used';

                return (
                  <li key={item.ref} role="listitem">
                    <div
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2.5',
                        'transition-colors',
                        'motion-safe:transition-all motion-safe:duration-150',
                        'hover:bg-accent'
                      )}
                    >
                      {/* Icon */}
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                        aria-hidden="true"
                      >
                        {IconComponent && <IconComponent className="h-4 w-4" />}
                      </span>

                      {/* Label + time */}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime}
                        </span>
                      </div>

                      {/* Restore button */}
                      <Button
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'flex h-8 flex-shrink-0 items-center gap-1.5 px-2 text-xs',
                          'text-muted-foreground',
                          'hover:bg-primary/10 hover:text-primary',
                          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          'motion-safe:opacity-0 motion-safe:group-hover:opacity-100',
                          'motion-safe:transition-opacity motion-safe:duration-150',
                          'focus-visible:opacity-100'
                        )}
                        onClick={() => handleRestore(item.ref)}
                        onKeyDown={(e) => handleItemKeyDown(e, index)}
                        aria-label={`Restore ${label} to your menu. ${relativeTime}.`}
                        type="button"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Restore</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 border-t border-border px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              Items here haven&apos;t been used recently. Restore to bring them
              back, or press
            </span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" aria-hidden="true" />
              <span>K</span>
            </kbd>
            <span>to find anything.</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
