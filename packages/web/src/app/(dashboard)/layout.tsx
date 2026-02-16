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

    const role = user.role;
    const menu = roleMenus[role];
    const lastSeedTime = menu?.lastSeedRun
      ? new Date(menu.lastSeedRun).getTime()
      : 0;
    const thirtyMinutes = 30 * 60 * 1000;

    if (Date.now() - lastSeedTime < thirtyMinutes) return;

    try {
      const seeds = computeSeeds({
        role,
        temporal: {
          currentHour: new Date().getHours(),
          currentMinute: new Date().getMinutes(),
          dayOfWeek: new Date().getDay(),
          weekOfTerm: null,
          isHoliday: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        menuItems: menu?.items || [],
        onboarding: {
          completedSteps: onboarding.completedSteps ?? [],
          interests: [],
          comfortLevel: 'intermediate',
        },
        peerPatterns: null,
        institutionalContext: null,
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
