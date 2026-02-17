'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CommandPalette } from '@/components/layout/command-palette';
import { Skeleton } from '@/components/ui/skeleton';
import { computeSeeds } from '@/services/seed-engine.service';
import type { RoleId, DayOfWeek, TimeBlock } from '@/types/seed-engine-types';

const DAYS_OF_WEEK: DayOfWeek[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function getTimeBlock(hour: number): TimeBlock {
  if (hour < 8) return 'early_morning';
  if (hour < 10) return 'morning';
  if (hour < 12) return 'late_morning';
  if (hour < 14) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 20) return 'evening';
  return 'night';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const router = useRouter();
  const { initRole, addSeeds, runDecayCycle, roleMenus } = useComposingMenuStore();
  const onboarding = useOnboardingStore();

  // Auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Phase 1: Initialise composing menu for user role
  useEffect(() => {
    if (user?.role) {
      initRole(user.role);
    }
  }, [user?.role, initRole]);

  // Phase 3: Run seed engine on session start (throttled to 30min intervals)
  useEffect(() => {
    if (!user?.role) return;

    const role = user.role as RoleId;
    const menu = roleMenus[role];
    const lastSeedTime = menu?.lastSeedRun
      ? new Date(menu.lastSeedRun).getTime()
      : 0;
    const thirtyMinutes = 30 * 60 * 1000;

    if (Date.now() - lastSeedTime < thirtyMinutes) return;

    try {
      const now = new Date();
      const hour = now.getHours();
      const day = DAYS_OF_WEEK[now.getDay()];
      const isSchoolDay = now.getDay() >= 1 && now.getDay() <= 5;

      const seeds = computeSeeds({
        role,
        temporal: {
          hour,
          dayOfWeek: day,
          timeBlock: getTimeBlock(hour),
          termWeek: 1,
          isSchoolDay,
        },
        menuItems: (menu?.items || []).map((item) => ({
          ...item,
          lastUsed: item.lastUsed ?? '',
        })),
        onboarding: {
          interests: [],
          subjects: [],
          yearLevels: [],
          languages: [],
          competitiveInterest: false,
          hasEarlyYearsChildren: false,
          profileCompleteness: 0,
        },
        peerPatterns: [],
        institutional: {
          activeEvents: [],
          currentTerm: 1,
          termsPerYear: 4,
          termWeek: 1,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (seeds.seeds && seeds.seeds.length > 0) {
        addSeeds(
          role,
          seeds.seeds.map((s) => ({
            ref: s.taskRef,
            score: s.compositeScore,
            reason: s.reason,
          }))
        );
      }
    } catch (error) {
      // Seed engine errors are non-critical; sidebar still works without seeds
      console.error('Seed engine error during computeSeeds:', error);
    }
  }, [user?.role, roleMenus, addSeeds, onboarding]);

  // Phase 4: Run decay cycle on session start
  useEffect(() => {
    if (user?.role) {
      runDecayCycle(user.role);
    }
  }, [user?.role, runDecayCycle]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Command Palette — global Cmd+K overlay */}
      <CommandPalette />

      {/* Sidebar — self-composing, role-adaptive navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header — breadcrumbs + command trigger + notifications + user menu */}
        <Header />

        {/* Page content — with consistent padding and scroll */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
