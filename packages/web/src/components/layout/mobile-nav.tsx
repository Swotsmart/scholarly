'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  Menu,
} from 'lucide-react';
import { useState } from 'react';

// Navigation configurations (same as sidebar)
const learnerNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Learning', href: '/learning', icon: BookOpen },
  { name: 'Golden Path', href: '/golden-path', icon: Compass },
  { name: 'LinguaFlow', href: '/linguaflow', icon: Languages },
  { name: 'Design & Pitch', href: '/design-pitch', icon: Lightbulb },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'AI Buddy', href: '/ai-buddy', icon: Bot },
  { name: 'Tutoring', href: '/tutoring', icon: GraduationCap },
  { name: 'Advanced Learning', href: '/advanced-learning', icon: Rocket },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const teacherNavigation = [
  { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { name: 'Classes', href: '/teacher/classes', icon: School },
  { name: 'Students', href: '/teacher/students', icon: Users },
  { name: 'Challenges', href: '/teacher/challenges', icon: Sparkles },
  { name: 'Journeys', href: '/teacher/journeys', icon: Map },
  { name: 'Grading', href: '/teacher/grading', icon: FileText },
  { name: 'Scheduling', href: '/teacher/scheduling', icon: CalendarClock },
  { name: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookMarked },
  { name: 'Reports', href: '/teacher/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const tutorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Students', href: '/tutoring/students', icon: Users },
  { name: 'Sessions', href: '/tutoring/sessions', icon: Calendar },
  { name: 'Availability', href: '/tutoring/availability', icon: CalendarClock },
  { name: 'Resources', href: '/tutoring/resources', icon: BookOpen },
  { name: 'Earnings', href: '/tutoring/earnings', icon: CreditCard },
  { name: 'Reviews', href: '/tutoring/reviews', icon: Award },
  { name: 'Profile', href: '/tutoring/profile', icon: Briefcase },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const parentNavigation = [
  { name: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
  { name: 'My Children', href: '/parent/children', icon: Users },
  { name: 'Little Explorers', href: '/early-years', icon: Sparkles },
  { name: 'Progress', href: '/parent/progress', icon: TrendingUp },
  { name: 'Portfolio', href: '/parent/portfolio', icon: Briefcase },
  { name: 'Messages', href: '/parent/messages', icon: MessageSquare },
  { name: 'Tutoring', href: '/parent/tutoring', icon: GraduationCap },
  { name: 'Calendar', href: '/parent/calendar', icon: Calendar },
  { name: 'Payments', href: '/parent/payments', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Scheduling', href: '/admin/scheduling', icon: CalendarClock },
  { name: 'Interoperability', href: '/admin/interoperability', icon: Network },
  { name: 'Standards', href: '/admin/standards', icon: Shield },
  { name: 'ML Pipeline', href: '/admin/ml', icon: Cpu },
  { name: 'Micro-Schools', href: '/admin/micro-schools', icon: Building },
  { name: 'Governance', href: '/admin/governance', icon: Landmark },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Marketplace', href: '/admin/marketplace', icon: Store },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navigation = getNavigationForRole(user?.role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Scholarly</span>
          </SheetTitle>
        </SheetHeader>

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
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info Footer */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
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
