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
  CalendarClock,
  School,
  FileText,
  TrendingUp,
  Clock,
  Languages,
  Bot,
  Database,
  MessageSquare,
  Compass,
  Brain,
  BookMarked,
  Briefcase,
  Crosshair,
  Map,
  Shield,
  Cpu,
  GitBranch,
  Network,
  Link2,
  Shapes,
  Award,
  Building,
  Landmark,
  Store,
  Rocket,
  Building2,
  Trophy,
  Search,
  BookCheck,
  Library,
  PenTool,
  DoorOpen,
  Maximize,
  CreditCard,
  Eye,
  Kanban,
  FolderKanban,
} from 'lucide-react';

// Navigation items for learners/students (UI/UX Design System v2.0)
const learnerNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Learning',
    href: '/learning',
    icon: BookOpen,
    children: [
      { name: 'Courses', href: '/learning/courses', icon: BookOpen },
      { name: 'Progress', href: '/learning/progress', icon: TrendingUp },
    ],
  },
  {
    name: 'Golden Path',
    href: '/golden-path',
    icon: Compass,
    children: [
      { name: 'Adaptation', href: '/golden-path/adaptation', icon: Brain },
      { name: 'Curiosity', href: '/golden-path/curiosity', icon: Sparkles },
      { name: 'Optimizer', href: '/golden-path/optimizer', icon: Target },
    ],
  },
  {
    name: 'LinguaFlow',
    href: '/linguaflow',
    icon: Languages,
    children: [
      { name: 'Vocabulary', href: '/linguaflow/vocabulary', icon: FileText },
      { name: 'Grammar', href: '/linguaflow/grammar', icon: GraduationCap },
      { name: 'Conversation', href: '/linguaflow/conversation', icon: MessageSquare },
      { name: 'Progress', href: '/linguaflow/progress', icon: TrendingUp },
    ],
  },
  {
    name: 'Design & Pitch',
    href: '/design-pitch',
    icon: Lightbulb,
    children: [
      { name: 'Challenges', href: '/design-pitch/challenges', icon: Sparkles },
      { name: 'Journeys', href: '/design-pitch/journeys', icon: Map },
      { name: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation },
    ],
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Briefcase,
    children: [
      { name: 'Artifacts', href: '/portfolio/artifacts', icon: FolderOpen },
      { name: 'Goals', href: '/portfolio/goals', icon: Crosshair },
      { name: 'Journeys', href: '/portfolio/journeys', icon: Map },
      { name: 'Showcase', href: '/portfolio/showcase', icon: Eye },
    ],
  },
  {
    name: 'AI Buddy',
    href: '/ai-buddy',
    icon: Bot,
  },
  {
    name: 'Tutoring',
    href: '/tutoring',
    icon: GraduationCap,
    children: [
      { name: 'Search', href: '/tutoring/search', icon: Search },
      { name: 'Bookings', href: '/tutoring/bookings', icon: Calendar },
    ],
  },
  {
    name: 'Advanced Learning',
    href: '/advanced-learning',
    icon: Rocket,
    children: [
      { name: 'EduScrum', href: '/advanced-learning/eduscrum', icon: Kanban },
      { name: 'PBL', href: '/advanced-learning/pbl', icon: FolderKanban },
      { name: 'Work Experience', href: '/advanced-learning/work-experience', icon: Building2 },
    ],
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Trophy,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Navigation items for teachers/educators (UI/UX Design System v2.0)
const teacherNavigation = [
  {
    name: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Classes',
    href: '/teacher/classes',
    icon: School,
  },
  {
    name: 'Students',
    href: '/teacher/students',
    icon: Users,
  },
  {
    name: 'Challenges',
    href: '/teacher/challenges',
    icon: Sparkles,
  },
  {
    name: 'Journeys',
    href: '/teacher/journeys',
    icon: Map,
  },
  {
    name: 'Grading',
    href: '/teacher/grading',
    icon: FileText,
    children: [
      { name: 'Pitches', href: '/teacher/grading/pitches', icon: Presentation },
      { name: 'Portfolios', href: '/teacher/grading/portfolios', icon: FolderOpen },
      { name: 'Gradebook', href: '/teacher/grading/gradebook', icon: BookCheck },
    ],
  },
  {
    name: 'Assessment',
    href: '/teacher/assessment',
    icon: ClipboardCheck,
    children: [
      { name: 'Library', href: '/teacher/assessment/library', icon: Library },
      { name: 'Builder', href: '/teacher/assessment/builder', icon: PenTool },
    ],
  },
  {
    name: 'Scheduling',
    href: '/teacher/scheduling',
    icon: CalendarClock,
    children: [
      { name: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar },
      { name: 'Relief', href: '/teacher/scheduling/relief', icon: Clock },
      { name: 'Rooms', href: '/teacher/scheduling/rooms', icon: DoorOpen },
      { name: 'Capacity', href: '/teacher/scheduling/capacity', icon: Maximize },
    ],
  },
  {
    name: 'Lesson Planner',
    href: '/teacher/lesson-planner',
    icon: BookMarked,
  },
  {
    name: 'Standards',
    href: '/teacher/standards',
    icon: Shield,
    children: [
      { name: 'Audits', href: '/teacher/standards/audits', icon: ClipboardCheck },
    ],
  },
  {
    name: 'ML Pipeline',
    href: '/teacher/ml',
    icon: Cpu,
    children: [
      { name: 'Models', href: '/teacher/ml/models', icon: GitBranch },
      { name: 'Predictions', href: '/teacher/ml/predictions', icon: TrendingUp },
    ],
  },
  {
    name: 'Reports',
    href: '/teacher/reports',
    icon: BarChart3,
  },
  {
    name: 'Settings',
    href: '/teacher/settings',
    icon: Settings,
  },
];

// Navigation items for tutors (UI/UX Design System v2.0)
const tutorNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Students',
    href: '/tutoring/students',
    icon: Users,
  },
  {
    name: 'Sessions',
    href: '/tutoring/sessions',
    icon: Calendar,
    children: [
      { name: 'Upcoming', href: '/tutoring/sessions/upcoming', icon: Clock },
      { name: 'History', href: '/tutoring/sessions/history', icon: FileText },
    ],
  },
  {
    name: 'Availability',
    href: '/tutoring/availability',
    icon: CalendarClock,
  },
  {
    name: 'Resources',
    href: '/tutoring/resources',
    icon: BookOpen,
    children: [
      { name: 'My Materials', href: '/tutoring/resources/materials', icon: FolderOpen },
      { name: 'Shared', href: '/tutoring/resources/shared', icon: Library },
    ],
  },
  {
    name: 'Earnings',
    href: '/tutoring/earnings',
    icon: CreditCard,
    children: [
      { name: 'Overview', href: '/tutoring/earnings/overview', icon: BarChart3 },
      { name: 'Payouts', href: '/tutoring/earnings/payouts', icon: TrendingUp },
    ],
  },
  {
    name: 'Reviews',
    href: '/tutoring/reviews',
    icon: Award,
  },
  {
    name: 'Profile',
    href: '/tutoring/profile',
    icon: Briefcase,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Navigation items for parents (UI/UX Design System v2.0)
const parentNavigation = [
  {
    name: 'Dashboard',
    href: '/parent/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Children',
    href: '/parent/children',
    icon: Users,
  },
  {
    name: 'Little Explorers',
    href: '/early-years',
    icon: Sparkles,
    description: 'Early childhood learning (ages 3-6)',
  },
  {
    name: 'Progress',
    href: '/parent/progress',
    icon: TrendingUp,
    children: [
      { name: 'Learning', href: '/parent/progress/learning', icon: BookOpen },
      { name: 'Grades', href: '/parent/progress/grades', icon: FileText },
      { name: 'Attendance', href: '/parent/progress/attendance', icon: ClipboardCheck },
    ],
  },
  {
    name: 'Portfolio',
    href: '/parent/portfolio',
    icon: Briefcase,
  },
  {
    name: 'Messages',
    href: '/parent/messages',
    icon: MessageSquare,
    children: [
      { name: 'Teachers', href: '/parent/messages/teachers', icon: School },
      { name: 'Tutors', href: '/parent/messages/tutors', icon: GraduationCap },
    ],
  },
  {
    name: 'Tutoring',
    href: '/parent/tutoring',
    icon: GraduationCap,
    children: [
      { name: 'Find Tutors', href: '/parent/tutoring/search', icon: Search },
      { name: 'Bookings', href: '/parent/tutoring/bookings', icon: Calendar },
    ],
  },
  {
    name: 'Calendar',
    href: '/parent/calendar',
    icon: Calendar,
  },
  {
    name: 'Payments',
    href: '/parent/payments',
    icon: CreditCard,
    children: [
      { name: 'History', href: '/parent/payments/history', icon: FileText },
      { name: 'Subscriptions', href: '/parent/payments/subscriptions', icon: Clock },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

// Navigation items for admins (UI/UX Design System v2.0)
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
      { name: 'Timetable', href: '/admin/scheduling/timetable', icon: Calendar },
      { name: 'Relief', href: '/admin/scheduling/relief', icon: Clock },
      { name: 'Rooms', href: '/admin/scheduling/rooms', icon: DoorOpen },
      { name: 'Constraints', href: '/admin/scheduling/constraints', icon: Settings },
    ],
  },
  {
    name: 'Interoperability',
    href: '/admin/interoperability',
    icon: Network,
    children: [
      { name: 'LTI', href: '/admin/interoperability/lti', icon: Link2 },
      { name: 'OneRoster', href: '/admin/interoperability/oneroster', icon: Users },
      { name: 'CASE', href: '/admin/interoperability/case', icon: Shapes },
      { name: 'Badges', href: '/admin/interoperability/badges', icon: Award },
      { name: 'Ed-Fi', href: '/admin/interoperability/edfi', icon: Database },
    ],
  },
  {
    name: 'Standards',
    href: '/admin/standards',
    icon: Shield,
  },
  {
    name: 'ML Pipeline',
    href: '/admin/ml',
    icon: Cpu,
  },
  {
    name: 'Micro-Schools',
    href: '/admin/micro-schools',
    icon: Building,
  },
  {
    name: 'Governance',
    href: '/admin/governance',
    icon: Landmark,
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: CreditCard,
  },
  {
    name: 'Marketplace',
    href: '/admin/marketplace',
    icon: Store,
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
    case 'tutor':
    case 'tutor_professional':
      return tutorNavigation;
    case 'parent':
    case 'guardian':
      return parentNavigation;
    case 'platform_admin':
    case 'admin':
      return adminNavigation;
    case 'learner':
    case 'student':
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
    case 'tutor':
    case 'tutor_professional':
      return {
        title: 'Tutor Tip',
        message: 'Keep your availability calendar updated to attract more bookings.',
      };
    case 'parent':
    case 'guardian':
      return {
        title: 'Parent Tip',
        message: 'Check weekly progress reports to stay connected with your child\'s learning.',
      };
    case 'platform_admin':
    case 'admin':
      return {
        title: 'Admin Tip',
        message: 'Check the scheduling constraints for optimal timetable generation.',
      };
    case 'learner':
    case 'student':
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
