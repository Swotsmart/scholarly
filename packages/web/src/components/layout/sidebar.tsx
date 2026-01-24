'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import {
  LayoutDashboard,
  Lightbulb,
  FolderOpen,
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  GraduationCap,
  Sparkles,
  Target,
  Presentation,
  ClipboardCheck,
  UserCheck,
  CalendarClock,
  School,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react';

// Navigation items for learners/students
const learnerNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Design & Pitch',
    href: '/design-pitch',
    icon: Lightbulb,
    children: [
      { name: 'My Journeys', href: '/design-pitch/journeys', icon: Target },
      { name: 'Challenges', href: '/design-pitch/challenges', icon: Sparkles },
      { name: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation },
    ],
  },
  {
    name: 'Showcase',
    href: '/showcase',
    icon: FolderOpen,
    children: [
      { name: 'My Portfolios', href: '/showcase/portfolios', icon: FolderOpen },
      { name: 'Analytics', href: '/showcase/analytics', icon: BarChart3 },
    ],
  },
  {
    name: 'Learning',
    href: '/learning',
    icon: BookOpen,
    children: [
      { name: 'Courses', href: '/learning/courses', icon: BookOpen },
      { name: 'My Progress', href: '/learning/progress', icon: Target },
    ],
  },
  {
    name: 'Tutoring',
    href: '/tutoring',
    icon: GraduationCap,
    children: [
      { name: 'Find Tutors', href: '/tutoring/search', icon: Users },
      { name: 'My Bookings', href: '/tutoring/bookings', icon: Calendar },
    ],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Navigation items for teachers/educators
const teacherNavigation = [
  {
    name: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Classes',
    href: '/teacher/classes',
    icon: School,
    children: [
      { name: 'All Classes', href: '/teacher/classes', icon: School },
      { name: 'Student Progress', href: '/teacher/students', icon: TrendingUp },
    ],
  },
  {
    name: 'Design Challenges',
    href: '/teacher/challenges',
    icon: Lightbulb,
    children: [
      { name: 'My Challenges', href: '/teacher/challenges', icon: Sparkles },
      { name: 'Create Challenge', href: '/teacher/challenges/create', icon: FileText },
      { name: 'Student Journeys', href: '/teacher/journeys', icon: Target },
    ],
  },
  {
    name: 'Peer Review',
    href: '/teacher/reviews',
    icon: ClipboardCheck,
    children: [
      { name: 'Review Queue', href: '/teacher/reviews', icon: ClipboardCheck },
      { name: 'Assignments', href: '/teacher/reviews/assignments', icon: UserCheck },
    ],
  },
  {
    name: 'Grading',
    href: '/teacher/grading',
    icon: FileText,
    children: [
      { name: 'Pitch Evaluations', href: '/teacher/grading/pitches', icon: Presentation },
      { name: 'Portfolio Reviews', href: '/teacher/grading/portfolios', icon: FolderOpen },
    ],
  },
  {
    name: 'Scheduling',
    href: '/teacher/scheduling',
    icon: CalendarClock,
    children: [
      { name: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar },
      { name: 'Relief Coverage', href: '/teacher/scheduling/relief', icon: Clock },
      { name: 'Room Booking', href: '/teacher/scheduling/rooms', icon: School },
    ],
  },
  {
    name: 'Reports',
    href: '/teacher/reports',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Navigation items for admins
const adminNavigation = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    name: 'Scheduling',
    href: '/admin/scheduling',
    icon: CalendarClock,
    children: [
      { name: 'Master Timetable', href: '/admin/scheduling/timetable', icon: Calendar },
      { name: 'Relief Management', href: '/admin/scheduling/relief', icon: Clock },
      { name: 'Room Management', href: '/admin/scheduling/rooms', icon: School },
      { name: 'Constraints', href: '/admin/scheduling/constraints', icon: Settings },
    ],
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

function getNavigationForRole(role: string | undefined) {
  switch (role) {
    case 'teacher':
    case 'educator':
      return teacherNavigation;
    case 'platform_admin':
    case 'admin':
      return adminNavigation;
    default:
      return learnerNavigation;
  }
}

function getTipForRole(role: string | undefined) {
  switch (role) {
    case 'teacher':
    case 'educator':
      return {
        title: 'Teacher Tip',
        message: 'Use peer review assignments to encourage collaborative learning.',
      };
    case 'platform_admin':
    case 'admin':
      return {
        title: 'Admin Tip',
        message: 'Check the scheduling constraints for optimal timetable generation.',
      };
    default:
      return {
        title: 'Pro Tip',
        message: 'Use the 10/20/30 rule for your pitch: 10 slides, 20 minutes, 30pt font.',
      };
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navigation = getNavigationForRole(user?.role);
  const tip = getTipForRole(user?.role);

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Scholarly</span>
          </Link>
        </div>

        {/* Role Badge */}
        {user && (
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground capitalize">{user.role || 'Learner'}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>

                  {/* Submenu */}
                  {item.children && isActive && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;

                        return (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                isChildActive
                                  ? 'bg-accent text-accent-foreground'
                                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                              )}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="rounded-lg bg-primary/10 p-4">
            <p className="text-sm font-medium text-primary">{tip.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{tip.message}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
