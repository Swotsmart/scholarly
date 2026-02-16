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
  Network, Shield, Cpu, BarChart3,
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
// COMMAND REGISTRY — All navigable destinations indexed for search
// ============================================================================
// Each item now includes a taskRef where it maps to a registered task.
// This enables the "Add to menu" action and usage tracking integration.
// ============================================================================

const commandItems: CommandItem[] = [
  // Universal
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, section: 'General', keywords: ['preferences', 'account', 'profile'], taskRef: 'X1' },

  // Student/Learner
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview'], role: ['learner', 'student'], taskRef: 'D1' },
  { id: 'courses', label: 'My Courses', href: '/learning/courses', icon: BookOpen, section: 'Learning', keywords: ['classes', 'lessons', 'study'], role: ['learner', 'student'], taskRef: 'L1' },
  { id: 'progress', label: 'My Progress', href: '/learning/progress', icon: TrendingUp, section: 'Learning', keywords: ['grades', 'performance'], role: ['learner', 'student'], taskRef: 'PROGRESS' },
  { id: 'ai-buddy', label: 'AI Buddy', href: '/ai-buddy', icon: Bot, section: 'Learning', keywords: ['help', 'assistant', 'chat', 'tutor'], role: ['learner', 'student'], taskRef: 'L3' },
  { id: 'design-challenges', label: 'Design Challenges', href: '/design-pitch/challenges', icon: Sparkles, section: 'Create', keywords: ['project', 'creative'], role: ['learner', 'student'], taskRef: 'L6L7' },
  { id: 'pitch-decks', label: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation, section: 'Create', keywords: ['present', 'slides'], role: ['learner', 'student'], taskRef: 'L6L7' },
  { id: 'portfolio', label: 'My Portfolio', href: '/portfolio', icon: Briefcase, section: 'Create', keywords: ['work', 'showcase'], role: ['learner', 'student'], taskRef: 'L8' },
  { id: 'showcase', label: 'Showcase', href: '/portfolio/showcase', icon: Eye, section: 'Create', keywords: ['public', 'gallery'], role: ['learner', 'student'], taskRef: 'L8' },
  { id: 'linguaflow', label: 'LinguaFlow', href: '/linguaflow', icon: Languages, section: 'Languages', keywords: ['language', 'learn', 'speak'], role: ['learner', 'student'], taskRef: 'LF' },
  { id: 'voice-practice', label: 'Voice Practice', href: '/linguaflow/voice', icon: Mic, section: 'Languages', keywords: ['speaking', 'pronunciation', 'elevenlabs'], role: ['learner', 'student'], taskRef: 'LF' },
  { id: 'vocabulary', label: 'Vocabulary', href: '/linguaflow/vocabulary', icon: FileText, section: 'Languages', keywords: ['words', 'flashcards'], role: ['learner', 'student'], taskRef: 'LF' },
  { id: 'conversation', label: 'Conversation Practice', href: '/linguaflow/conversation', icon: MessageSquare, section: 'Languages', keywords: ['speaking', 'chat'], role: ['learner', 'student'], taskRef: 'LF' },
  { id: 'golden-path', label: 'Golden Path', href: '/golden-path', icon: Compass, section: 'Adaptive', keywords: ['personalized', 'pathway'], role: ['learner', 'student'], taskRef: 'L4L5' },
  { id: 'find-tutors', label: 'Find Tutors', href: '/tutoring/search', icon: Search, section: 'Support', keywords: ['help', 'teacher', 'mentor'], role: ['learner', 'student'], taskRef: 'F5-learner' },
  { id: 'achievements', label: 'Achievements', href: '/achievements', icon: Trophy, section: 'Rewards', keywords: ['badges', 'awards', 'xp'], role: ['learner', 'student'], taskRef: 'L9' },

  // Teacher
  { id: 't-dashboard', label: 'Teacher Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview', 'today'], role: ['teacher', 'educator'], taskRef: 'D1-teacher' },
  { id: 't-classes', label: 'My Classes', href: '/teacher/classes', icon: School, section: 'Teaching', keywords: ['rosters', 'students'], role: ['teacher', 'educator'], taskRef: 'TEACHER_CLASSES' },
  { id: 't-students', label: 'Students', href: '/teacher/students', icon: Users, section: 'Teaching', keywords: ['roster', 'at-risk', 'wellbeing'], role: ['teacher', 'educator'], taskRef: 'TEACHER_STUDENTS' },
  { id: 't-lesson-planner', label: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookOpen, section: 'Teaching', keywords: ['plan', 'schedule', 'prepare'], role: ['teacher', 'educator'], taskRef: 'T1' },
  { id: 't-gradebook', label: 'Gradebook', href: '/teacher/gradebook', icon: BookCheck, section: 'Assessment', keywords: ['grades', 'marks', 'scores', 'feedback'], role: ['teacher', 'educator'], taskRef: 'T2' },
  { id: 't-assessment-lib', label: 'Assessment Library', href: '/teacher/assessment/library', icon: Library, section: 'Assessment', keywords: ['tests', 'quizzes', 'exams'], role: ['teacher', 'educator'], taskRef: 'T3T4' },
  { id: 't-assessment-build', label: 'Assessment Builder', href: '/teacher/assessment/builder', icon: PenTool, section: 'Assessment', keywords: ['create', 'new', 'quiz'], role: ['teacher', 'educator'], taskRef: 'T3T4' },
  { id: 't-grading', label: 'Grade Work', href: '/teacher/grading', icon: PenLine, section: 'Assessment', keywords: ['mark', 'review', 'submit'], role: ['teacher', 'educator'], taskRef: 'T5' },
  { id: 't-attendance', label: 'Take Attendance', href: '/teacher/attendance', icon: ClipboardList, section: 'Quick Actions', keywords: ['roll', 'present', 'absent', 'check'], role: ['teacher', 'educator'], taskRef: 'D2' },
  { id: 't-timetable', label: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar, section: 'Scheduling', keywords: ['schedule', 'periods'], role: ['teacher', 'educator'], taskRef: 'D4' },
  { id: 't-relief', label: 'Relief Teaching', href: '/teacher/scheduling/relief', icon: Clock, section: 'Scheduling', keywords: ['substitute', 'cover', 'absence'], role: ['teacher', 'educator'], taskRef: 'TEACHER_SCHED' },
  { id: 't-challenges', label: 'Create Challenge', href: '/teacher/challenges/create', icon: PlusCircle, section: 'Quick Actions', keywords: ['new', 'assignment', 'task'], role: ['teacher', 'educator'], taskRef: 'T6' },
  { id: 't-reports', label: 'Reports', href: '/teacher/reports', icon: BarChart3, section: 'Analytics', keywords: ['data', 'insights', 'analytics'], role: ['teacher', 'educator'], taskRef: 'T8' },
  { id: 't-standards', label: 'Standards', href: '/teacher/standards', icon: Shield, section: 'Compliance', keywords: ['audit', 'curriculum'], role: ['teacher', 'educator'], taskRef: 'T7' },

  // Parent
  { id: 'p-dashboard', label: 'Parent Dashboard', href: '/parent/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'family'], role: ['parent', 'guardian'], taskRef: 'D1-parent' },
  { id: 'p-children', label: 'My Children', href: '/parent/children', icon: Users, section: 'Family', keywords: ['kids', 'students'], role: ['parent', 'guardian'], taskRef: 'F1' },
  { id: 'p-early-years', label: 'Little Explorers', href: '/early-years', icon: Sparkles, section: 'Family', keywords: ['preschool', 'kindergarten', 'early'], role: ['parent', 'guardian'], taskRef: 'F8' },
  { id: 'p-learning', label: 'Learning Progress', href: '/parent/progress/learning', icon: BookOpen, section: 'Progress', keywords: ['courses', 'study'], role: ['parent', 'guardian'], taskRef: 'F1_PROGRESS' },
  { id: 'p-grades', label: 'Grades', href: '/parent/progress/grades', icon: FileText, section: 'Progress', keywords: ['marks', 'results', 'scores'], role: ['parent', 'guardian'], taskRef: 'F1_PROGRESS' },
  { id: 'p-attendance', label: 'Attendance', href: '/parent/progress/attendance', icon: ClipboardCheck, section: 'Progress', keywords: ['absent', 'present'], role: ['parent', 'guardian'], taskRef: 'F1_PROGRESS' },
  { id: 'p-messages', label: 'Messages', href: '/parent/messages', icon: MessageSquare, section: 'Communication', keywords: ['chat', 'contact', 'teacher'], role: ['parent', 'guardian'], taskRef: 'D3-parent' },
  { id: 'p-calendar', label: 'Calendar', href: '/parent/calendar', icon: Calendar, section: 'Communication', keywords: ['events', 'schedule'], role: ['parent', 'guardian'], taskRef: 'F4' },
  { id: 'p-find-tutors', label: 'Find Tutors', href: '/parent/tutoring/search', icon: Search, section: 'Support', keywords: ['help', 'book'], role: ['parent', 'guardian'], taskRef: 'F5' },
  { id: 'p-payments', label: 'Payments', href: '/parent/payments', icon: CreditCard, section: 'Account', keywords: ['billing', 'subscription', 'invoice'], role: ['parent', 'guardian'], taskRef: 'F6' },

  // Tutor
  { id: 'tu-dashboard', label: 'Tutor Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home'], role: ['tutor', 'tutor_professional'], taskRef: 'D1' },
  { id: 'tu-students', label: 'My Students', href: '/tutoring/students', icon: Users, section: 'Tutoring', keywords: ['learners', 'roster'], role: ['tutor', 'tutor_professional'], taskRef: 'TU5' },
  { id: 'tu-upcoming', label: 'Upcoming Sessions', href: '/tutoring/sessions/upcoming', icon: Clock, section: 'Tutoring', keywords: ['next', 'schedule'], role: ['tutor', 'tutor_professional'], taskRef: 'TU2' },
  { id: 'tu-availability', label: 'Availability', href: '/tutoring/availability', icon: Calendar, section: 'Tutoring', keywords: ['schedule', 'calendar', 'hours'], role: ['tutor', 'tutor_professional'], taskRef: 'TU1' },
  { id: 'tu-earnings', label: 'Earnings', href: '/tutoring/earnings/overview', icon: CreditCard, section: 'Earnings', keywords: ['money', 'income', 'payout'], role: ['tutor', 'tutor_professional'], taskRef: 'TU7' },

  // Admin
  { id: 'a-dashboard', label: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview'], role: ['admin', 'platform_admin'], taskRef: 'D1-admin' },
  { id: 'a-users', label: 'Manage Users', href: '/admin/users', icon: Users, section: 'Administration', keywords: ['accounts', 'people', 'roles'], role: ['admin', 'platform_admin'], taskRef: 'A1' },
  { id: 'a-timetable', label: 'School Timetable', href: '/admin/scheduling/timetable', icon: Calendar, section: 'Scheduling', keywords: ['schedule', 'periods'], role: ['admin', 'platform_admin'], taskRef: 'D4-admin' },
  { id: 'a-reports', label: 'Reports', href: '/admin/reports', icon: BarChart3, section: 'Analytics', keywords: ['data', 'insights'], role: ['admin', 'platform_admin'], taskRef: 'T8-admin' },
  { id: 'a-interop', label: 'Interoperability', href: '/admin/interoperability', icon: Network, section: 'Systems', keywords: ['lti', 'oneroster', 'integration'], role: ['admin', 'platform_admin'], taskRef: 'A4' },
];

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
  const role = user?.role || 'learner';

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
    const userRole = user?.role || 'learner';
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
  }, [query, user?.role]);

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
