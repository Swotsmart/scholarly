'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useSidebarStore } from '@/stores/sidebar-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard, BookOpen, Calendar, Settings, GraduationCap,
  Sparkles, Target, Presentation, ClipboardCheck, CalendarClock,
  School, FileText, TrendingUp, Clock, Languages, Bot,
  MessageSquare, Compass, Brain, Briefcase, Map, Lightbulb,
  Users, AlertTriangle, ChevronRight, ChevronDown,
  Search, Star, StarOff, PanelLeftClose, PanelLeft,
  PlusCircle, PenLine, ClipboardList, Zap,
  MoreHorizontal, Pin, ChevronUp, Home,
  BookCheck, Library, PenTool, DoorOpen, Maximize,
  CreditCard, Eye, Kanban, FolderKanban, Building2,
  Trophy, FolderOpen, Crosshair, Rocket, Award,
  Network, Link2, Shapes, Database, Shield, Cpu, GitBranch,
  Building, Landmark, Store, BarChart3, Mic,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string | number;
  children?: NavChild[];
}

interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  id: string;
  label: string;
  tier: 'primary' | 'secondary' | 'advanced';
  items: NavItem[];
}

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
}

// ============================================================================
// NAVIGATION DEFINITIONS — Grouped by task frequency (Progressive Disclosure)
// ============================================================================
// Tier 1 (Primary): The 20% of features handling 80% of daily tasks
// Tier 2 (Secondary): Regularly used but not daily
// Tier 3 (Advanced): Power-user / admin features — hidden by default
// ============================================================================

const learnerSections: NavSection[] = [
  {
    id: 'core',
    label: 'My Learning',
    tier: 'primary',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Courses', href: '/learning/courses', icon: BookOpen, badge: 2, description: 'Active courses and lessons' },
      { name: 'AI Buddy', href: '/ai-buddy', icon: Bot, description: 'Your personal learning assistant' },
      { name: 'Progress', href: '/learning/progress', icon: TrendingUp, description: 'Track your learning journey' },
    ],
  },
  {
    id: 'creative',
    label: 'Create & Explore',
    tier: 'primary',
    items: [
      { name: 'Design & Pitch', href: '/design-pitch', icon: Lightbulb, children: [
        { name: 'Challenges', href: '/design-pitch/challenges', icon: Sparkles },
        { name: 'Journeys', href: '/design-pitch/journeys', icon: Map },
        { name: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation },
      ]},
      { name: 'Portfolio', href: '/portfolio', icon: Briefcase, children: [
        { name: 'Artifacts', href: '/portfolio/artifacts', icon: FolderOpen },
        { name: 'Goals', href: '/portfolio/goals', icon: Crosshair },
        { name: 'Showcase', href: '/portfolio/showcase', icon: Eye },
      ]},
    ],
  },
  {
    id: 'languages',
    label: 'Languages',
    tier: 'secondary',
    items: [
      { name: 'LinguaFlow', href: '/linguaflow', icon: Languages, children: [
        { name: 'Voice Practice', href: '/linguaflow/voice', icon: Mic },
        { name: 'Vocabulary', href: '/linguaflow/vocabulary', icon: FileText },
        { name: 'Grammar', href: '/linguaflow/grammar', icon: GraduationCap },
        { name: 'Conversation', href: '/linguaflow/conversation', icon: MessageSquare },
        { name: 'Progress', href: '/linguaflow/progress', icon: TrendingUp },
      ]},
    ],
  },
  {
    id: 'support',
    label: 'Support & Tutoring',
    tier: 'secondary',
    items: [
      { name: 'Find Tutors', href: '/tutoring/search', icon: Search },
      { name: 'My Bookings', href: '/tutoring/bookings', icon: Calendar },
    ],
  },
  {
    id: 'adaptive',
    label: 'Adaptive Learning',
    tier: 'advanced',
    items: [
      { name: 'Golden Path', href: '/golden-path', icon: Compass, children: [
        { name: 'Adaptation', href: '/golden-path/adaptation', icon: Brain },
        { name: 'Curiosity', href: '/golden-path/curiosity', icon: Sparkles },
        { name: 'Optimizer', href: '/golden-path/optimizer', icon: Target },
      ]},
      { name: 'Advanced Learning', href: '/advanced-learning', icon: Rocket, children: [
        { name: 'EduScrum', href: '/advanced-learning/eduscrum', icon: Kanban },
        { name: 'PBL', href: '/advanced-learning/pbl', icon: FolderKanban },
        { name: 'Work Experience', href: '/advanced-learning/work-experience', icon: Building2 },
      ]},
      { name: 'Achievements', href: '/achievements', icon: Trophy },
    ],
  },
];

const teacherSections: NavSection[] = [
  {
    id: 'today',
    label: 'Today',
    tier: 'primary',
    items: [
      { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
      { name: 'My Classes', href: '/teacher/classes', icon: School, description: 'Current classes and rosters' },
      { name: 'Students', href: '/teacher/students', icon: Users, badge: '3 alerts', description: 'Student profiles and wellbeing' },
    ],
  },
  {
    id: 'teach',
    label: 'Teaching & Assessment',
    tier: 'primary',
    items: [
      { name: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookOpen, description: 'Plan and manage lessons' },
      { name: 'Gradebook', href: '/teacher/gradebook', icon: BookCheck, description: 'Grades and feedback' },
      { name: 'Assessment', href: '/teacher/assessment', icon: ClipboardCheck, children: [
        { name: 'Library', href: '/teacher/assessment/library', icon: Library },
        { name: 'Builder', href: '/teacher/assessment/builder', icon: PenTool },
      ]},
      { name: 'Grading', href: '/teacher/grading', icon: FileText, children: [
        { name: 'Pitches', href: '/teacher/grading/pitches', icon: Presentation },
        { name: 'Portfolios', href: '/teacher/grading/portfolios', icon: FolderOpen },
      ]},
    ],
  },
  {
    id: 'schedule',
    label: 'Scheduling',
    tier: 'secondary',
    items: [
      { name: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar },
      { name: 'Relief', href: '/teacher/scheduling/relief', icon: Clock },
      { name: 'Rooms', href: '/teacher/scheduling/rooms', icon: DoorOpen },
      { name: 'Capacity', href: '/teacher/scheduling/capacity', icon: Maximize },
    ],
  },
  {
    id: 'curriculum',
    label: 'Curriculum & Standards',
    tier: 'secondary',
    items: [
      { name: 'Challenges', href: '/teacher/challenges', icon: Sparkles },
      { name: 'Journeys', href: '/teacher/journeys', icon: Map },
      { name: 'Standards', href: '/teacher/standards', icon: Shield },
      { name: 'Reports', href: '/teacher/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'insights',
    label: 'AI & Insights',
    tier: 'advanced',
    items: [
      { name: 'ML Pipeline', href: '/teacher/ml', icon: Cpu, children: [
        { name: 'Models', href: '/teacher/ml/models', icon: GitBranch },
        { name: 'Predictions', href: '/teacher/ml/predictions', icon: TrendingUp },
      ]},
    ],
  },
];

const parentSections: NavSection[] = [
  {
    id: 'family',
    label: 'Family Hub',
    tier: 'primary',
    items: [
      { name: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
      { name: 'My Children', href: '/parent/children', icon: Users, description: 'View and manage children' },
      { name: 'Little Explorers', href: '/early-years', icon: Sparkles, description: 'Early childhood (ages 3-6)' },
    ],
  },
  {
    id: 'progress',
    label: 'Learning & Progress',
    tier: 'primary',
    items: [
      { name: 'Learning', href: '/parent/progress/learning', icon: BookOpen },
      { name: 'Grades', href: '/parent/progress/grades', icon: FileText },
      { name: 'Attendance', href: '/parent/progress/attendance', icon: ClipboardCheck },
      { name: 'Portfolio', href: '/parent/portfolio', icon: Briefcase },
    ],
  },
  {
    id: 'communicate',
    label: 'Communication',
    tier: 'primary',
    items: [
      { name: 'Messages', href: '/parent/messages', icon: MessageSquare, badge: 2, children: [
        { name: 'Teachers', href: '/parent/messages/teachers', icon: School },
        { name: 'Tutors', href: '/parent/messages/tutors', icon: GraduationCap },
      ]},
      { name: 'Calendar', href: '/parent/calendar', icon: Calendar },
    ],
  },
  {
    id: 'support',
    label: 'Tutoring & Payments',
    tier: 'secondary',
    items: [
      { name: 'Find Tutors', href: '/parent/tutoring/search', icon: Search },
      { name: 'Bookings', href: '/parent/tutoring/bookings', icon: Calendar },
      { name: 'Payments', href: '/parent/payments', icon: CreditCard, children: [
        { name: 'History', href: '/parent/payments/history', icon: FileText },
        { name: 'Subscriptions', href: '/parent/payments/subscriptions', icon: Clock },
      ]},
    ],
  },
];

const tutorSections: NavSection[] = [
  {
    id: 'core',
    label: 'My Tutoring',
    tier: 'primary',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My Students', href: '/tutoring/students', icon: Users },
      { name: 'Sessions', href: '/tutoring/sessions', icon: Calendar, children: [
        { name: 'Upcoming', href: '/tutoring/sessions/upcoming', icon: Clock },
        { name: 'History', href: '/tutoring/sessions/history', icon: FileText },
      ]},
      { name: 'Availability', href: '/tutoring/availability', icon: CalendarClock },
    ],
  },
  {
    id: 'resources',
    label: 'Resources & Reviews',
    tier: 'secondary',
    items: [
      { name: 'My Materials', href: '/tutoring/resources/materials', icon: FolderOpen },
      { name: 'Shared Library', href: '/tutoring/resources/shared', icon: Library },
      { name: 'Reviews', href: '/tutoring/reviews', icon: Award },
      { name: 'Profile', href: '/tutoring/profile', icon: Briefcase },
    ],
  },
  {
    id: 'earnings',
    label: 'Earnings',
    tier: 'secondary',
    items: [
      { name: 'Overview', href: '/tutoring/earnings/overview', icon: BarChart3 },
      { name: 'Payouts', href: '/tutoring/earnings/payouts', icon: CreditCard },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    id: 'overview',
    label: 'Administration',
    tier: 'primary',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    tier: 'primary',
    items: [
      { name: 'Timetable', href: '/admin/scheduling/timetable', icon: Calendar },
      { name: 'Relief', href: '/admin/scheduling/relief', icon: Clock },
      { name: 'Rooms', href: '/admin/scheduling/rooms', icon: DoorOpen },
      { name: 'Constraints', href: '/admin/scheduling/constraints', icon: Settings },
    ],
  },
  {
    id: 'systems',
    label: 'Systems & Integration',
    tier: 'secondary',
    items: [
      { name: 'Interoperability', href: '/admin/interoperability', icon: Network, children: [
        { name: 'LTI', href: '/admin/interoperability/lti', icon: Link2 },
        { name: 'OneRoster', href: '/admin/interoperability/oneroster', icon: Users },
        { name: 'CASE', href: '/admin/interoperability/case', icon: Shapes },
        { name: 'Badges', href: '/admin/interoperability/badges', icon: Award },
        { name: 'Ed-Fi', href: '/admin/interoperability/edfi', icon: Database },
      ]},
      { name: 'Standards', href: '/admin/standards', icon: Shield },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    tier: 'advanced',
    items: [
      { name: 'Micro-Schools', href: '/admin/micro-schools', icon: Building },
      { name: 'Governance', href: '/admin/governance', icon: Landmark },
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
      { name: 'Marketplace', href: '/admin/marketplace', icon: Store },
      { name: 'ML Pipeline', href: '/admin/ml', icon: Cpu },
    ],
  },
];

// ============================================================================
// QUICK ACTIONS — Contextual to persona (Principle 4: Contextual Intelligence)
// ============================================================================

function getQuickActionsForRole(role: string | undefined): QuickAction[] {
  switch (role) {
    case 'teacher':
    case 'educator':
      return [
        { label: 'Attendance', href: '/teacher/attendance', icon: ClipboardList, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'New Lesson', href: '/teacher/lessons/new', icon: PlusCircle, color: 'text-green-500 bg-green-500/10' },
        { label: 'Grade Work', href: '/teacher/grading', icon: PenLine, color: 'text-orange-500 bg-orange-500/10' },
        { label: 'New Challenge', href: '/teacher/challenges/create', icon: Lightbulb, color: 'text-purple-500 bg-purple-500/10' },
      ];
    case 'parent':
    case 'guardian':
      return [
        { label: 'Messages', href: '/parent/messages', icon: MessageSquare, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Progress', href: '/parent/progress', icon: TrendingUp, color: 'text-green-500 bg-green-500/10' },
        { label: 'Book Tutor', href: '/parent/tutoring/search', icon: Search, color: 'text-purple-500 bg-purple-500/10' },
      ];
    case 'tutor':
    case 'tutor_professional':
      return [
        { label: 'Next Session', href: '/tutoring/sessions/upcoming', icon: Calendar, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Resources', href: '/tutoring/resources/materials', icon: FolderOpen, color: 'text-green-500 bg-green-500/10' },
        { label: 'Earnings', href: '/tutoring/earnings/overview', icon: CreditCard, color: 'text-orange-500 bg-orange-500/10' },
      ];
    default:
      return [
        { label: 'Continue', href: '/learning/courses', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'AI Buddy', href: '/ai-buddy', icon: Bot, color: 'text-purple-500 bg-purple-500/10' },
        { label: 'Portfolio', href: '/portfolio', icon: Briefcase, color: 'text-green-500 bg-green-500/10' },
      ];
  }
}

// ============================================================================
// ROLE → SECTIONS MAPPING
// ============================================================================

function getSectionsForRole(role: string | undefined): NavSection[] {
  switch (role) {
    case 'teacher':
    case 'educator':
      return teacherSections;
    case 'tutor':
    case 'tutor_professional':
      return tutorSections;
    case 'parent':
    case 'guardian':
      return parentSections;
    case 'platform_admin':
    case 'admin':
      return adminSections;
    default:
      return learnerSections;
  }
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { collapsed, favorites, showAdvanced, toggleCollapsed, toggleFavorite, toggleAdvanced } = useSidebarStore();

  const sections = useMemo(() => getSectionsForRole(user?.role), [user?.role]);
  const quickActions = useMemo(() => getQuickActionsForRole(user?.role), [user?.role]);

  // Filter nav items by search
  const [navSearch, setNavSearch] = useState('');

  const filteredSections = useMemo(() => {
    if (!navSearch.trim()) return sections;
    const query = navSearch.toLowerCase();
    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.children?.some(c => c.name.toLowerCase().includes(query))
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [sections, navSearch]);

  // Visible sections: always show primary + secondary, only show advanced if toggled
  const visibleSections = useMemo(() => {
    return filteredSections.filter(
      s => s.tier === 'primary' || s.tier === 'secondary' || (s.tier === 'advanced' && showAdvanced)
    );
  }, [filteredSections, showAdvanced]);

  const hasAdvanced = sections.some(s => s.tier === 'advanced');

  // Favorite items across all sections
  const favoriteItems = useMemo(() => {
    const all: NavItem[] = [];
    sections.forEach(s => s.items.forEach(item => {
      if (favorites.includes(item.href)) all.push(item);
    }));
    return all;
  }, [sections, favorites]);

  // ---- Collapsed (icon-only) sidebar ----
  if (collapsed) {
    return (
      <aside className="hidden w-16 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b">
          <Link href="/dashboard">
            <GraduationCap className="h-7 w-7 text-primary" />
          </Link>
        </div>

        {/* Quick nav icons */}
        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="space-y-1 px-2">
            {sections
              .filter(s => s.tier === 'primary')
              .flatMap(s => s.items)
              .map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.name}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* Expand */}
        <div className="border-t p-2">
          <button
            onClick={toggleCollapsed}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent mx-auto"
            title="Expand sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>
      </aside>
    );
  }

  // ---- Expanded sidebar ----
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
      {/* Logo + Collapse */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">Scholarly</span>
        </Link>
        <button
          onClick={toggleCollapsed}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Role + Search */}
      <div className="px-3 py-2 space-y-2 border-b">
        {user && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="capitalize">{user.role || 'Learner'}</span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search navigation..."
            value={navSearch}
            onChange={e => setNavSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Quick Actions — Principle 4: Contextual Intelligence */}
      {!navSearch && quickActions.length > 0 && (
        <div className="px-3 py-2 border-b">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors hover:bg-accent',
                    action.color
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Favorites */}
      {!navSearch && favoriteItems.length > 0 && (
        <div className="px-3 py-2 border-b">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
            <Star className="inline h-3 w-3 mr-1 text-yellow-500" />
            Favorites
          </p>
          <ul className="space-y-0.5">
            {favoriteItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {visibleSections.map((section, idx) => (
          <SidebarSection
            key={section.id}
            section={section}
            pathname={pathname}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            isLast={idx === visibleSections.length - 1}
          />
        ))}

        {/* Show/Hide Advanced Toggle */}
        {hasAdvanced && !navSearch && (
          <button
            onClick={toggleAdvanced}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50 transition-colors mt-1"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide Advanced
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show Advanced
              </>
            )}
          </button>
        )}
      </nav>

      {/* Settings Footer */}
      <div className="border-t px-3 py-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

// ============================================================================
// SIDEBAR SECTION COMPONENT
// ============================================================================

function SidebarSection({
  section,
  pathname,
  favorites,
  onToggleFavorite,
  isLast,
}: {
  section: NavSection;
  pathname: string;
  favorites: string[];
  onToggleFavorite: (href: string) => void;
  isLast: boolean;
}) {
  return (
    <div className={cn('py-1', !isLast && 'mb-1')}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 px-2">
        {section.label}
      </p>
      <ul className="space-y-0.5">
        {section.items.map(item => (
          <SidebarItem
            key={item.href}
            item={item}
            pathname={pathname}
            isFavorite={favorites.includes(item.href)}
            onToggleFavorite={() => onToggleFavorite(item.href)}
          />
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// SIDEBAR ITEM COMPONENT — With expandable children and favorite toggle
// ============================================================================

function SidebarItem({
  item,
  pathname,
  isFavorite,
  onToggleFavorite,
}: {
  item: NavItem;
  pathname: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(isActive && hasChildren);
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  // Auto-expand when navigating to a child route
  useEffect(() => {
    if (isActive && hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActive, hasChildren]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li>
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={item.href}
          onClick={hasChildren ? (e) => { e.preventDefault(); setIsExpanded(!isExpanded); } : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">{item.name}</span>

          {/* Badge */}
          {item.badge && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {item.badge}
            </span>
          )}

          {/* Expand/collapse chevron for items with children */}
          {hasChildren && (
            <ChevronRight className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          )}
        </Link>

        {/* Favorite toggle on hover */}
        {isHovered && !hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/40 hover:text-yellow-500 transition-colors"
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            ) : (
              <Star className="h-3 w-3" />
            )}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
          {item.children!.map(child => {
            const ChildIcon = child.icon;
            const isChildActive = pathname === child.href;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    isChildActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  {child.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
