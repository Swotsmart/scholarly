'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Check,
  MessageCircle,
  AlertTriangle,
  BookOpen,
  Calendar,
  Clock,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';
import { Breadcrumbs } from './breadcrumbs';
import { CommandPaletteTrigger } from './command-palette';

// ============================================================================
// NOTIFICATION TYPES & MOCK DATA
// ============================================================================

interface Notification {
  id: string;
  type: 'academic' | 'message' | 'alert' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
  href?: string;
}

const mockNotifications: Notification[] = [
  { id: 'n1', type: 'alert', title: 'James Chen needs attention', description: 'Missed 3 consecutive assignments in Design & Tech', time: '15 min ago', read: false, href: '/teacher/students' },
  { id: 'n2', type: 'message', title: 'New message from Emma Thompson', description: 'Can you review my prototype before tomorrow?', time: '1 hour ago', read: false, href: '/teacher/help-requests' },
  { id: 'n3', type: 'academic', title: 'Assessments ready for review', description: '12 pitch deck submissions waiting for grading', time: '2 hours ago', read: false, href: '/teacher/grading' },
  { id: 'n4', type: 'system', title: 'Timetable updated', description: 'Room 204 unavailable tomorrow — auto-reassigned to Room 301', time: '3 hours ago', read: true, href: '/teacher/scheduling/timetable' },
  { id: 'n5', type: 'academic', title: 'AI Insight: Year 10 prototyping', description: 'Students struggling with low-fidelity prototyping techniques', time: '5 hours ago', read: true, href: '/teacher/dashboard' },
];

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'alert': return AlertTriangle;
    case 'message': return MessageCircle;
    case 'academic': return BookOpen;
    case 'system': return Calendar;
  }
}

function getNotificationColor(type: Notification['type']) {
  switch (type) {
    case 'alert': return 'text-orange-500 bg-orange-500/10';
    case 'message': return 'text-blue-500 bg-blue-500/10';
    case 'academic': return 'text-purple-500 bg-purple-500/10';
    case 'system': return 'text-gray-500 bg-gray-500/10';
  }
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
      {/* Left: Mobile nav + Breadcrumbs */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <MobileNav />
        <Breadcrumbs className="hidden md:flex" />
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden lg:flex flex-shrink-0 mx-4">
        <CommandPaletteTrigger className="w-64" />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications ({unreadCount} unread)</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.map(notification => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 cursor-pointer',
                      !notification.read && 'bg-accent/30'
                    )}
                    onClick={() => {
                      markRead(notification.id);
                      if (notification.href) router.push(notification.href);
                    }}
                  >
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !notification.read && 'font-medium')}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground/70">{notification.time}</span>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-xs text-primary"
              onClick={() => router.push('/notifications')}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
                <AvatarFallback className="text-xs">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/help')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
