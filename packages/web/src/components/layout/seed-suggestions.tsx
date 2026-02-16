'use client';

// =============================================================================
// SEED SUGGESTIONS — Sidebar section for AI-suggested menu items
// =============================================================================
// Renders seed suggestions inside the sidebar using existing shadcn components
// and Tailwind utility classes. Seeds are shown with a sparkle indicator and
// dashed border, with pin/dismiss actions on hover.
// =============================================================================

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { getTask } from '@/config/menu-registry';
import { Button } from '@/components/ui/button';
import { Sparkles, Pin, X } from 'lucide-react';
import type { ComposingMenuItem } from '@/types/composing-menu-types';

interface SeedSuggestionsProps {
  seeds: ComposingMenuItem[];
  role: string;
  className?: string;
}

export function SeedSuggestions({ seeds, role, className }: SeedSuggestionsProps) {
  const store = useComposingMenuStore();

  const handlePin = useCallback(
    (taskRef: string) => store.promoteSeed(role, taskRef),
    [store, role]
  );

  const handleDismiss = useCallback(
    (taskRef: string) => store.dismissSeed(role, taskRef),
    [store, role]
  );

  if (seeds.length === 0) return null;

  return (
    <div className={cn('px-3 py-2 border-t border-sidebar-border', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 flex items-center gap-1 px-2">
        <Sparkles className="h-3 w-3 text-amber-500" />
        Suggested for you
      </p>
      <ul className="space-y-0.5" role="list">
        {seeds.map((seed) => {
          const task = getTask(seed.ref);
          if (!task) return null;
          const Icon = task.icon;

          return (
            <li key={seed.ref}>
              <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/10 border border-dashed border-sidebar-border/50">
                <Icon className="h-4 w-4 text-accent shrink-0" />
                <span className="text-sm flex-1 truncate">{task.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handlePin(seed.ref)}
                  title="Add to menu"
                  aria-label={`Add ${task.name} to your menu`}
                >
                  <Pin className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => handleDismiss(seed.ref)}
                  title="Dismiss suggestion"
                  aria-label={`Dismiss ${task.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
