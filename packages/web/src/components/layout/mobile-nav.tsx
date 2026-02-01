'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard, BookOpen, Users, Calendar, Settings, GraduationCap,
  Sparkles, Map, FileText, BarChart3, CalendarClock, School, Compass,
  Languages, Bot, MessageSquare, Briefcase, TrendingUp, CreditCard,
  Award, Network, Shield, Cpu, Building, Landmark, Store, Rocket,
  Trophy, BookMarked, Menu, Search, Home, User,
  ChevronDown, ChevronUp, X, Mic,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  children?: MobileNavItem[];
}

interface MobileNavSection {
  label: string;
  items: MobileNavItem[];
  tier: 'primary' | 'secondary' | 'advanced';
}

interface BottomTabItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

// =============================================================================
// ROLE-SPECIFIC BOTTOM TABS — the 4 most-used destinations per persona
// =============================================================================

const learnerBottomTabs: BottomTabItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Learn', href: '/learning', icon: BookOpen },
  { label: 'AI Buddy', href: '/ai-buddy', icon: Bot },
  { label: 'Profile', href: '/profile', icon: User },
];

const teacherBottomTabs: BottomTabItem[] = [
  { label: 'Home', href: '/teacher/dashboard', icon: Home },
  { label: 'Classes', href: '/teacher/classes', icon: School },
  { label: 'Grading', href: '/teacher/grading', icon: FileText },
  { label: 'Students', href: '/teacher/students', icon: Users },
];

const parentBottomTabs: BottomTabItem[] = [
  { label: 'Home', href: '/parent/dashboard', icon: Home },
  { label: 'Children', href: '/parent/children', icon: Users },
  { label: 'Messages', href: '/parent/messages', icon: MessageSquare, badge: 3 },
  { label: 'Progress', href: '/parent/progress', icon: TrendingUp },
];

const tutorBottomTabs: BottomTabItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Sessions', href: '/tutoring/sessions', icon: Calendar },
  { label: 'Students', href: '/tutoring/students', icon: Users },
  { label: 'Earnings', href: '/tutoring/earnings', icon: CreditCard },
];

const adminBottomTabs: BottomTabItem[] = [
  { label: 'Home', href: '/admin/dashboard', icon: Home },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

// =============================================================================
// ROLE-SPECIFIC HAMBURGER MENU SECTIONS
// =============================================================================

const learnerMenuSections: MobileNavSection[] = [
  { label: 'Learning', tier: 'primary', items: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Courses', href: '/learning', icon: BookOpen },
    { label: 'Golden Path', href: '/golden-path', icon: Compass },
    { label: 'LinguaFlow', href: '/linguaflow', icon: Languages },
    { label: 'Voice Practice', href: '/linguaflow/voice', icon: Mic },
  ]},
  { label: 'Create & Share', tier: 'secondary', items: [
    { label: 'Design & Pitch', href: '/design-pitch', icon: Sparkles },
    { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { label: 'Achievements', href: '/achievements', icon: Trophy },
  ]},
  { label: 'Support', tier: 'secondary', items: [
    { label: 'AI Buddy', href: '/ai-buddy', icon: Bot },
    { label: 'Find a Tutor', href: '/tutoring', icon: GraduationCap },
  ]},
  { label: 'Advanced', tier: 'advanced', items: [
    { label: 'Advanced Learning', href: '/advanced-learning', icon: Rocket },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
];

const teacherMenuSections: MobileNavSection[] = [
  { label: 'Today', tier: 'primary', items: [
    { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Classes', href: '/teacher/classes', icon: School },
    { label: 'Students', href: '/teacher/students', icon: Users, badge: 3 },
  ]},
  { label: 'Teaching', tier: 'primary', items: [
    { label: 'Challenges', href: '/teacher/challenges', icon: Sparkles },
    { label: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookMarked },
    { label: 'Grading', href: '/teacher/grading', icon: FileText, badge: 12 },
  ]},
  { label: 'Management', tier: 'secondary', items: [
    { label: 'Scheduling', href: '/teacher/scheduling', icon: CalendarClock },
    { label: 'Reports', href: '/teacher/reports', icon: BarChart3 },
    { label: 'Journeys', href: '/teacher/journeys', icon: Map },
  ]},
  { label: 'Settings', tier: 'secondary', items: [
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
];

const parentMenuSections: MobileNavSection[] = [
  { label: 'Family Hub', tier: 'primary', items: [
    { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
    { label: 'My Children', href: '/parent/children', icon: Users },
    { label: 'Little Explorers', href: '/early-years', icon: Sparkles },
  ]},
  { label: 'Stay Connected', tier: 'primary', items: [
    { label: 'Progress', href: '/parent/progress', icon: TrendingUp },
    { label: 'Messages', href: '/parent/messages', icon: MessageSquare, badge: 3 },
    { label: 'Calendar', href: '/parent/calendar', icon: Calendar },
  ]},
  { label: 'Support', tier: 'secondary', items: [
    { label: 'Find Tutors', href: '/parent/tutoring', icon: GraduationCap },
    { label: 'Payments', href: '/parent/payments', icon: CreditCard },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
];

const tutorMenuSections: MobileNavSection[] = [
  { label: 'Tutoring', tier: 'primary', items: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Students', href: '/tutoring/students', icon: Users },
    { label: 'Sessions', href: '/tutoring/sessions', icon: Calendar },
    { label: 'Availability', href: '/tutoring/availability', icon: CalendarClock },
  ]},
  { label: 'Business', tier: 'secondary', items: [
    { label: 'Resources', href: '/tutoring/resources', icon: BookOpen },
    { label: 'Earnings', href: '/tutoring/earnings', icon: CreditCard },
    { label: 'Reviews', href: '/tutoring/reviews', icon: Award },
    { label: 'Profile', href: '/tutoring/profile', icon: Briefcase },
  ]},
  { label: 'Settings', tier: 'secondary', items: [
    { label: 'Settings', href: '/settings', icon: Settings },
  ]},
];

const adminMenuSections: MobileNavSection[] = [
  { label: 'Platform', tier: 'primary', items: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  ]},
  { label: 'Operations', tier: 'secondary', items: [
    { label: 'Scheduling', href: '/admin/scheduling', icon: CalendarClock },
    { label: 'Micro-Schools', href: '/admin/micro-schools', icon: Building },
    { label: 'Payments', href: '/admin/payments', icon: CreditCard },
    { label: 'Marketplace', href: '/admin/marketplace', icon: Store },
  ]},
  { label: 'Advanced', tier: 'advanced', items: [
    { label: 'Interoperability', href: '/admin/interoperability', icon: Network },
    { label: 'Standards', href: '/admin/standards', icon: Shield },
    { label: 'ML Pipeline', href: '/admin/ml', icon: Cpu },
    { label: 'Governance', href: '/admin/governance', icon: Landmark },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ]},
];

// =============================================================================
// HELPERS
// =============================================================================

function getBottomTabsForRole(role: string | undefined): BottomTabItem[] {
  switch (role) {
    case 'teacher':
    case 'educator': return teacherBottomTabs;
    case 'parent':
    case 'guardian': return parentBottomTabs;
    case 'tutor':
    case 'tutor_professional': return tutorBottomTabs;
    case 'platform_admin':
    case 'admin': return adminBottomTabs;
    default: return learnerBottomTabs;
  }
}

function getMenuSectionsForRole(role: string | undefined): MobileNavSection[] {
  switch (role) {
    case 'teacher':
    case 'educator': return teacherMenuSections;
    case 'parent':
    case 'guardian': return parentMenuSections;
    case 'tutor':
    case 'tutor_professional': return tutorMenuSections;
    case 'platform_admin':
    case 'admin': return adminMenuSections;
    default: return learnerMenuSections;
  }
}

// =============================================================================
// BOTTOM TAB BAR
// =============================================================================

export function MobileBottomTabs() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const tabs = useMemo(() => getBottomTabsForRole(user?.role), [user?.role]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
         aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// =============================================================================
// HAMBURGER SHEET MENU — progressive disclosure with sections and search
// =============================================================================

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const sections = useMemo(() => getMenuSectionsForRole(user?.role), [user?.role]);

  // Filter items by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return sections.filter(s => showAdvanced || s.tier !== 'advanced');
    }
    const query = searchQuery.toLowerCase();
    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(query)
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [sections, searchQuery, showAdvanced]);

  const hasAdvanced = sections.some(s => s.tier === 'advanced');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Scholarly</span>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search navigation..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground capitalize">{user.role || 'Learner'}</span>
            </div>
          </div>
        )}

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5" aria-label="Navigation menu">
          {filteredSections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <Badge variant={isActive ? 'secondary' : 'default'} className="h-5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Show Advanced toggle */}
          {hasAdvanced && !searchQuery && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          )}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
