'use client';

import { useState } from 'react';
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
  Bot,
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
import { AskIssyHeader, IssyOnboardingOverlay, useIssyOnboarding } from './ask-issy-header';
import { useNotifications } from '@/hooks/use-notifications';

// ============================================================================
// NOTIFICATION DISPLAY HELPERS (used by dropdown)
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
  const { resolvedTheme, setTheme } = useTheme();
  const [issyOpen, setIssyOpen] = useState(false);
  const { showOnboarding, dismissOnboarding } = useIssyOnboarding();

  // Real notification data from API (falls back to DEMO_MODE data when backend unavailable)
  const {
    notifications: rawNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ fetchDigest: false, fetchInsights: false });

  // Bridge API notifications to the existing dropdown display format
  const notifications: Notification[] = rawNotifications.slice(0, 5).map(n => {
    const typeMap: Record<string, Notification['type']> = {
      learning: 'academic', wellbeing: 'alert', parent: 'message',
      storybook: 'academic', system: 'system', auth: 'system',
      payment: 'system', content: 'academic', governance: 'system',
      arena: 'academic', subscription: 'system',
    };
    const prefix = n.type.split('_')[0] || 'system';
    const diff = Date.now() - new Date(n.createdAt).getTime();
    const mins = Math.floor(diff / 60_000);
    const timeStr = mins < 60 ? `${mins} min ago`
      : mins < 1440 ? `${Math.floor(mins / 60)} hour${Math.floor(mins / 60) > 1 ? 's' : ''} ago`
      : `${Math.floor(mins / 1440)} day${Math.floor(mins / 1440) > 1 ? 's' : ''} ago`;

    return {
      id: n.id,
      type: typeMap[prefix] || 'system',
      title: n.title,
      description: n.body,
      time: timeStr,
      read: n.inAppStatus !== 'unread',
    };
  });

  const markRead = (id: string) => { markAsRead(id); };
  const markAllRead = () => { markAllAsRead(); };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 items-center border-b bg-card px-4 lg:px-6 gap-2">
      {/* Left: Mobile nav + Breadcrumbs + Search */}
      <div className="flex items-center gap-3 min-w-0">
        <MobileNav />
        <Breadcrumbs className="hidden md:flex" />
        <div className="hidden lg:flex flex-shrink-0">
          <CommandPaletteTrigger className="w-48" />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ask Issy — prominent CTA with pulse glow */}
      <Button
        onClick={() => setIssyOpen(true)}
        className="hidden sm:flex h-9 gap-2 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold text-sm animate-issy-pulse"
      >
        <Bot className="h-4 w-4" />
        Ask Issy
      </Button>

      {/* Mobile: Icon-only Ask Issy */}
      <Button
        variant="default"
        size="icon"
        className="sm:hidden h-8 w-8"
        onClick={() => setIssyOpen(true)}
      >
        <Bot className="h-4 w-4" />
      </Button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
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

      {/* Ask Issy Dialog */}
      <AskIssyHeader open={issyOpen} onOpenChange={setIssyOpen} />

      {/* Onboarding Overlay — shown once per user */}
      <IssyOnboardingOverlay
        open={showOnboarding}
        onDismiss={dismissOnboarding}
        onAskIssy={() => setIssyOpen(true)}
      />
    </header>
  );
}
