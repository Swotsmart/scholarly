'use client';

// ============================================================================
// COMMAND PALETTE — Self-Composing Interface Integration (Phase 2)
// ============================================================================
// Extended to:
//   1. Fire recordUse() when a user navigates via Cmd+K
//   2. Show "Add to menu" action for tasks not currently in the user's menu
//   3. Show "In your menu" indicator for tasks already present
//   4. Surface the menu toast system for promotion/auto-add feedback
//
// The command palette is the power-user escape hatch — it provides access
// to every navigable destination regardless of what's in the composing menu.
// But it also feeds into the menu's learning system: navigating via Cmd+K
// counts as a meaningful use, driving the promotion pipeline.
//
// Original preserved at command-palette.tsx.original.
// ============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { useMenuToast } from '@/hooks/use-menu-toast';
import { findTaskByPath, getTask, taskRegistry } from '@/config/menu-registry';
import {
  LayoutDashboard, BookOpen, Settings, GraduationCap,
  Sparkles, Target, Presentation, ClipboardCheck,
  School, FileText, TrendingUp, Languages, Bot,
  MessageSquare, Compass, Brain, Briefcase,
  Users, Search, Calendar, Clock,
  Lightbulb, PlusCircle, PenLine, ClipboardList,
  BookCheck, Library, PenTool, DoorOpen,
  CreditCard, Eye, Kanban, FolderKanban,
  Trophy, FolderOpen, Rocket, Award,
  Network, Shield, Cpu, BarChart3, Workflow,
  Building, Landmark, Store, Map,
  ArrowRight, Command, CornerDownLeft,
  Mic, Pin, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  section: string;
  keywords: string[];
  role?: string[];
  /** Task ref from the composing menu registry, if this item maps to one */
  taskRef?: string;
}

// ============================================================================
// COMMAND REGISTRY — Auto-generated from the task registry
// ============================================================================
// Items are dynamically derived from the single source of truth (taskRegistry)
// so that any new module added to the registry is instantly discoverable in
// the command palette, Ask Issy, and the composing menu — no manual sync.
// ============================================================================

const clusterToSection: Record<string, string> = {
  daily: 'Navigation',
  teaching: 'Teaching',
  learning: 'Learning',
  language: 'Languages',
  family: 'Family',
  homeschool: 'Homeschool',
  tutoring: 'Tutoring',
  admin: 'Administration',
  arena: 'Arena',
  creator: 'Content Creation',
  automation: 'Automation',
  cross: 'General',
};

// Map clusters to the roles they're relevant to.
// Tasks in clusters not listed here are shown to ALL roles.
const clusterToRoles: Record<string, string[] | undefined> = {
  teaching: ['teacher', 'educator'],
  family: ['parent', 'guardian', 'learner', 'student'],
  homeschool: ['homeschool', 'homeschool_parent'],
  tutoring: ['tutor', 'tutor_professional'],
  admin: ['admin', 'platform_admin'],
  creator: ['creator', 'content_creator'],
};

// Role-specific task overrides (for refs that end in -teacher, -parent, etc.)
function getRoleForRef(ref: string): string[] | undefined {
  if (ref.endsWith('-teacher') || ref === 'D2' || ref === 'D5' || ref === 'D4' || ref === 'TEACHER_CLASSES' || ref === 'TEACHER_STUDENTS' || ref === 'TEACHER_SCHED') return ['teacher', 'educator'];
  if (ref.endsWith('-parent')) return ['parent', 'guardian'];
  if (ref.endsWith('-admin')) return ['admin', 'platform_admin'];
  if (ref.endsWith('-learner') || ref === 'PROGRESS' || ref === 'LEARNER_CAL' || ref === 'LEARNER_BOOK' || ref === 'ADV_LEARNING') return ['learner', 'student'];
  return undefined;
}

function buildCommandItems(): CommandItem[] {
  const items: CommandItem[] = [];

  for (const task of Object.values(taskRegistry)) {
    const section = clusterToSection[task.cluster] || 'General';
    const role = getRoleForRef(task.ref) || clusterToRoles[task.cluster];

    // Build keywords from name, description, and children
    const keywords = [
      ...task.name.toLowerCase().split(/\s+/),
      ...(task.description || '').toLowerCase().split(/\s+/).filter(w => w.length > 2),
    ];
    if (task.children) {
      for (const child of task.children) {
        keywords.push(...child.name.toLowerCase().split(/\s+/));
      }
    }

    // Add the main task
    items.push({
      id: task.ref,
      label: task.name,
      description: task.description,
      href: task.href,
      icon: task.icon,
      section,
      keywords: [...new Set(keywords)],
      role,
      taskRef: task.ref,
    });

    // Add children as separate searchable items
    if (task.children) {
      for (const child of task.children) {
        // Skip children whose href is identical to the parent (they're just the default view)
        if (child.href === task.href) continue;
        items.push({
          id: `${task.ref}_${child.name.replace(/\s+/g, '_')}`,
          label: `${task.name} > ${child.name}`,
          href: child.href,
          icon: child.icon,
          section,
          keywords: [...child.name.toLowerCase().split(/\s+/), ...task.name.toLowerCase().split(/\s+/)],
          role,
          taskRef: task.ref,
        });
      }
    }
  }

  return items;
}

const commandItems: CommandItem[] = buildCommandItems();

// ============================================================================
// COMMAND PALETTE COMPONENT
// ============================================================================

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const menuToast = useMenuToast();
  const role = user?.role || user?.roles?.[0] || 'learner';

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Navigate and track usage ──
  const navigateAndTrack = useCallback((item: CommandItem) => {
    // Navigate
    router.push(item.href);
    setOpen(false);

    // Fire usage event for the composing menu system
    if (item.taskRef && role) {
      const result = store.recordUse(role, item.taskRef);
      menuToast.handleUseResult(result, role, item.taskRef);
    }
  }, [router, store, role, menuToast]);

  // ── Add to menu directly (without navigating) ──
  const addToMenu = useCallback((item: CommandItem) => {
    if (!item.taskRef || !role) return;
    store.respondToPromotion(role, item.taskRef, 'yes');
    menuToast.showAutoAdded({ role, taskRef: item.taskRef });
  }, [store, role, menuToast]);

  // ── Check if a task is already in the user's visible menu ──
  const isInMenu = useCallback((taskRef: string | undefined): boolean => {
    if (!taskRef) return false;
    const item = store.getItem(role, taskRef);
    if (!item) return false;
    return item.state === 'anchor' || item.state === 'active' || item.state === 'pushed' || item.state === 'seed';
  }, [store, role]);

  // Filter items by role and query
  const filteredItems = useMemo(() => {
    const userRole = user?.role || user?.roles?.[0] || 'learner';
    const roleFiltered = commandItems.filter(
      item => !item.role || item.role.includes(userRole)
    );

    if (!query.trim()) return roleFiltered.slice(0, 12);

    const q = query.toLowerCase();
    return roleFiltered
      .filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.includes(q))
      )
      .slice(0, 10);
  }, [query, user?.role, user?.roles]);

  // Group by section
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    });
    return groups;
  }, [filteredItems]);

  const flatItems = filteredItems;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault();
      navigateAndTrack(flatItems[selectedIndex]);
    }
  }, [flatItems, selectedIndex, navigateAndTrack]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-card shadow-2xl"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, and features..."
            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={flatItems[selectedIndex]?.id}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} id="command-list" className="max-h-72 overflow-y-auto p-2" role="listbox">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(groupedItems).map(([section, items]) => (
              <div key={section} role="group" aria-label={section}>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section}
                </p>
                {items.map((item) => {
                  const globalIndex = flatItems.indexOf(item);
                  const Icon = item.icon;
                  const isSelected = globalIndex === selectedIndex;
                  const inMenu = isInMenu(item.taskRef);

                  return (
                    <div
                      key={item.id}
                      data-index={globalIndex}
                      id={item.id}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors group',
                        isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                      )}
                    >
                      {/* Main clickable area — navigates */}
                      <button
                        onClick={() => navigateAndTrack(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                      </button>

                      {/* Right side: menu status or add action */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {inMenu && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50" title="Already in your menu">
                            <Check className="h-3 w-3" />
                          </span>
                        )}

                        {!inMenu && item.taskRef && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToMenu(item);
                            }}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Add to menu"
                            aria-label={`Add ${item.label} to your menu`}
                          >
                            <Pin className="h-3 w-3" />
                            <span className="hidden sm:inline">Add</span>
                          </button>
                        )}

                        {isSelected && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
                            <CornerDownLeft className="h-3 w-3" />
                            <span>Open</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5">↑</kbd>
              <kbd className="rounded border bg-muted px-1 py-0.5">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5">↵</kbd>
              Open
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5">ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// COMMAND PALETTE TRIGGER
// ============================================================================

export function CommandPaletteTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      }}
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors',
        className
      )}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search or jump to...</span>
      <kbd className="hidden sm:inline-flex ml-auto items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">
        <Command className="h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}
