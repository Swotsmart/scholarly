'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
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
  Mic,
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
}

// ============================================================================
// COMMAND REGISTRY — All navigable destinations indexed for search
// ============================================================================

const commandItems: CommandItem[] = [
  // Universal
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, section: 'General', keywords: ['preferences', 'account', 'profile'] },

  // Student/Learner
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview'], role: ['learner', 'student'] },
  { id: 'courses', label: 'My Courses', href: '/learning/courses', icon: BookOpen, section: 'Learning', keywords: ['classes', 'lessons', 'study'], role: ['learner', 'student'] },
  { id: 'progress', label: 'My Progress', href: '/learning/progress', icon: TrendingUp, section: 'Learning', keywords: ['grades', 'performance'], role: ['learner', 'student'] },
  { id: 'ai-buddy', label: 'AI Buddy', href: '/ai-buddy', icon: Bot, section: 'Learning', keywords: ['help', 'assistant', 'chat', 'tutor'], role: ['learner', 'student'] },
  { id: 'design-challenges', label: 'Design Challenges', href: '/design-pitch/challenges', icon: Sparkles, section: 'Create', keywords: ['project', 'creative'], role: ['learner', 'student'] },
  { id: 'pitch-decks', label: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation, section: 'Create', keywords: ['present', 'slides'], role: ['learner', 'student'] },
  { id: 'portfolio', label: 'My Portfolio', href: '/portfolio', icon: Briefcase, section: 'Create', keywords: ['work', 'showcase'], role: ['learner', 'student'] },
  { id: 'showcase', label: 'Showcase', href: '/portfolio/showcase', icon: Eye, section: 'Create', keywords: ['public', 'gallery'], role: ['learner', 'student'] },
  { id: 'linguaflow', label: 'LinguaFlow', href: '/linguaflow', icon: Languages, section: 'Languages', keywords: ['language', 'learn', 'speak'], role: ['learner', 'student'] },
  { id: 'voice-practice', label: 'Voice Practice', href: '/linguaflow/voice', icon: Mic, section: 'Languages', keywords: ['speaking', 'pronunciation', 'elevenlabs'], role: ['learner', 'student'] },
  { id: 'vocabulary', label: 'Vocabulary', href: '/linguaflow/vocabulary', icon: FileText, section: 'Languages', keywords: ['words', 'flashcards'], role: ['learner', 'student'] },
  { id: 'conversation', label: 'Conversation Practice', href: '/linguaflow/conversation', icon: MessageSquare, section: 'Languages', keywords: ['speaking', 'chat'], role: ['learner', 'student'] },
  { id: 'golden-path', label: 'Golden Path', href: '/golden-path', icon: Compass, section: 'Adaptive', keywords: ['personalized', 'pathway'], role: ['learner', 'student'] },
  { id: 'find-tutors', label: 'Find Tutors', href: '/tutoring/search', icon: Search, section: 'Support', keywords: ['help', 'teacher', 'mentor'], role: ['learner', 'student'] },
  { id: 'achievements', label: 'Achievements', href: '/achievements', icon: Trophy, section: 'Rewards', keywords: ['badges', 'awards', 'xp'], role: ['learner', 'student'] },

  // Teacher
  { id: 't-dashboard', label: 'Teacher Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview', 'today'], role: ['teacher', 'educator'] },
  { id: 't-classes', label: 'My Classes', href: '/teacher/classes', icon: School, section: 'Teaching', keywords: ['rosters', 'students'], role: ['teacher', 'educator'] },
  { id: 't-students', label: 'Students', href: '/teacher/students', icon: Users, section: 'Teaching', keywords: ['roster', 'at-risk', 'wellbeing'], role: ['teacher', 'educator'] },
  { id: 't-lesson-planner', label: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookOpen, section: 'Teaching', keywords: ['plan', 'schedule', 'prepare'], role: ['teacher', 'educator'] },
  { id: 't-gradebook', label: 'Gradebook', href: '/teacher/gradebook', icon: BookCheck, section: 'Assessment', keywords: ['grades', 'marks', 'scores', 'feedback'], role: ['teacher', 'educator'] },
  { id: 't-assessment-lib', label: 'Assessment Library', href: '/teacher/assessment/library', icon: Library, section: 'Assessment', keywords: ['tests', 'quizzes', 'exams'], role: ['teacher', 'educator'] },
  { id: 't-assessment-build', label: 'Assessment Builder', href: '/teacher/assessment/builder', icon: PenTool, section: 'Assessment', keywords: ['create', 'new', 'quiz'], role: ['teacher', 'educator'] },
  { id: 't-grading', label: 'Grade Work', href: '/teacher/grading', icon: PenLine, section: 'Assessment', keywords: ['mark', 'review', 'submit'], role: ['teacher', 'educator'] },
  { id: 't-attendance', label: 'Take Attendance', href: '/teacher/attendance', icon: ClipboardList, section: 'Quick Actions', keywords: ['roll', 'present', 'absent', 'check'], role: ['teacher', 'educator'] },
  { id: 't-timetable', label: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar, section: 'Scheduling', keywords: ['schedule', 'periods'], role: ['teacher', 'educator'] },
  { id: 't-relief', label: 'Relief Teaching', href: '/teacher/scheduling/relief', icon: Clock, section: 'Scheduling', keywords: ['substitute', 'cover', 'absence'], role: ['teacher', 'educator'] },
  { id: 't-challenges', label: 'Create Challenge', href: '/teacher/challenges/create', icon: PlusCircle, section: 'Quick Actions', keywords: ['new', 'assignment', 'task'], role: ['teacher', 'educator'] },
  { id: 't-reports', label: 'Reports', href: '/teacher/reports', icon: BarChart3, section: 'Analytics', keywords: ['data', 'insights', 'analytics'], role: ['teacher', 'educator'] },
  { id: 't-standards', label: 'Standards', href: '/teacher/standards', icon: Shield, section: 'Compliance', keywords: ['audit', 'curriculum'], role: ['teacher', 'educator'] },

  // Parent
  { id: 'p-dashboard', label: 'Parent Dashboard', href: '/parent/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'family'], role: ['parent', 'guardian'] },
  { id: 'p-children', label: 'My Children', href: '/parent/children', icon: Users, section: 'Family', keywords: ['kids', 'students'], role: ['parent', 'guardian'] },
  { id: 'p-early-years', label: 'Little Explorers', href: '/early-years', icon: Sparkles, section: 'Family', keywords: ['preschool', 'kindergarten', 'early'], role: ['parent', 'guardian'] },
  { id: 'p-learning', label: 'Learning Progress', href: '/parent/progress/learning', icon: BookOpen, section: 'Progress', keywords: ['courses', 'study'], role: ['parent', 'guardian'] },
  { id: 'p-grades', label: 'Grades', href: '/parent/progress/grades', icon: FileText, section: 'Progress', keywords: ['marks', 'results', 'scores'], role: ['parent', 'guardian'] },
  { id: 'p-attendance', label: 'Attendance', href: '/parent/progress/attendance', icon: ClipboardCheck, section: 'Progress', keywords: ['absent', 'present'], role: ['parent', 'guardian'] },
  { id: 'p-messages', label: 'Messages', href: '/parent/messages', icon: MessageSquare, section: 'Communication', keywords: ['chat', 'contact', 'teacher'], role: ['parent', 'guardian'] },
  { id: 'p-calendar', label: 'Calendar', href: '/parent/calendar', icon: Calendar, section: 'Communication', keywords: ['events', 'schedule'], role: ['parent', 'guardian'] },
  { id: 'p-find-tutors', label: 'Find Tutors', href: '/parent/tutoring/search', icon: Search, section: 'Support', keywords: ['help', 'book'], role: ['parent', 'guardian'] },
  { id: 'p-payments', label: 'Payments', href: '/parent/payments', icon: CreditCard, section: 'Account', keywords: ['billing', 'subscription', 'invoice'], role: ['parent', 'guardian'] },

  // Tutor
  { id: 'tu-dashboard', label: 'Tutor Dashboard', href: '/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home'], role: ['tutor', 'tutor_professional'] },
  { id: 'tu-students', label: 'My Students', href: '/tutoring/students', icon: Users, section: 'Tutoring', keywords: ['learners', 'roster'], role: ['tutor', 'tutor_professional'] },
  { id: 'tu-upcoming', label: 'Upcoming Sessions', href: '/tutoring/sessions/upcoming', icon: Clock, section: 'Tutoring', keywords: ['next', 'schedule'], role: ['tutor', 'tutor_professional'] },
  { id: 'tu-availability', label: 'Availability', href: '/tutoring/availability', icon: Calendar, section: 'Tutoring', keywords: ['schedule', 'calendar', 'hours'], role: ['tutor', 'tutor_professional'] },
  { id: 'tu-earnings', label: 'Earnings', href: '/tutoring/earnings/overview', icon: CreditCard, section: 'Earnings', keywords: ['money', 'income', 'payout'], role: ['tutor', 'tutor_professional'] },

  // Admin
  { id: 'a-dashboard', label: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview'], role: ['admin', 'platform_admin'] },
  { id: 'a-users', label: 'Manage Users', href: '/admin/users', icon: Users, section: 'Administration', keywords: ['accounts', 'people', 'roles'], role: ['admin', 'platform_admin'] },
  { id: 'a-timetable', label: 'School Timetable', href: '/admin/scheduling/timetable', icon: Calendar, section: 'Scheduling', keywords: ['schedule', 'periods'], role: ['admin', 'platform_admin'] },
  { id: 'a-reports', label: 'Reports', href: '/admin/reports', icon: BarChart3, section: 'Analytics', keywords: ['data', 'insights'], role: ['admin', 'platform_admin'] },
  { id: 'a-interop', label: 'Interoperability', href: '/admin/interoperability', icon: Network, section: 'Systems', keywords: ['lti', 'oneroster', 'integration'], role: ['admin', 'platform_admin'] },
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

  // Filter items by role and query
  const filteredItems = useMemo(() => {
    const userRole = user?.role || 'learner';
    const roleFiltered = commandItems.filter(
      item => !item.role || item.role.includes(userRole)
    );

    if (!query.trim()) return roleFiltered.slice(0, 12); // Show top items when no query

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
      router.push(flatItems[selectedIndex].href);
      setOpen(false);
    }
  }, [flatItems, selectedIndex, router]);

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
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-card shadow-2xl">
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
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section}
                </p>
                {items.map((item) => {
                  const globalIndex = flatItems.indexOf(item);
                  const Icon = item.icon;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={globalIndex}
                      onClick={() => { router.push(item.href); setOpen(false); }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                      )}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CornerDownLeft className="h-3 w-3" />
                          <span>Open</span>
                        </div>
                      )}
                    </button>
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
// COMMAND PALETTE TRIGGER — Renders a clickable search bar that opens palette
// ============================================================================

export function CommandPaletteTrigger({ className }: { className?: string }) {
  return (
    <button
      onClick={() => {
        // Dispatch Cmd+K event to open palette
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
