'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// =============================================================================
// SIDEBAR SKELETON — mirrors the 3-tier progressive disclosure sidebar
// =============================================================================

export function SidebarSkeleton() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card" aria-label="Loading navigation">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      {/* Quick Actions grid */}
      <div className="p-4 border-b">
        <Skeleton className="h-3 w-20 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>

      {/* Navigation sections */}
      <div className="flex-1 overflow-hidden p-4 space-y-6">
        {/* Primary section */}
        <div>
          <Skeleton className="h-3 w-16 mb-3" />
          <div className="space-y-1.5">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>

        {/* Secondary section */}
        <div>
          <Skeleton className="h-3 w-20 mb-3" />
          <div className="space-y-1.5">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>

        {/* Tertiary section */}
        <div>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="space-y-1.5">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
    </aside>
  );
}

// =============================================================================
// HEADER SKELETON — mirrors breadcrumbs + command trigger + actions
// =============================================================================

export function HeaderSkeleton() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6" aria-label="Loading header">
      {/* Left: breadcrumbs area */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 lg:hidden" /> {/* Mobile menu button */}
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-3 hidden sm:block" />
        <Skeleton className="h-4 w-24 hidden sm:block" />
        <Skeleton className="h-3 w-3 hidden md:block" />
        <Skeleton className="h-4 w-20 hidden md:block" />
      </div>

      {/* Center: command palette trigger */}
      <div className="hidden sm:block">
        <Skeleton className="h-9 w-64 rounded-lg" />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" /> {/* Theme */}
        <Skeleton className="h-9 w-9 rounded-lg" /> {/* Notifications */}
        <Skeleton className="h-9 w-9 rounded-full" /> {/* Avatar */}
      </div>
    </header>
  );
}

// =============================================================================
// DASHBOARD SKELETON — mirrors the intelligent dashboard layout
// =============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      {/* Hero greeting */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-24 rounded-xl" />
            <Skeleton className="h-14 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Insights grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="mt-3 space-y-1.5">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Continuations */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sidebar content */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
            <Skeleton className="h-9 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MOBILE BOTTOM TAB SKELETON
// =============================================================================

export function MobileBottomTabsSkeleton() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card lg:hidden" aria-label="Loading mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-2 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FULL PAGE SKELETON — sidebar + header + dashboard combined
// =============================================================================

export function FullPageSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarSkeleton />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderSkeleton />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
      <MobileBottomTabsSkeleton />
    </div>
  );
}

// =============================================================================
// ONBOARDING SKELETON
// =============================================================================

export function OnboardingSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-2 w-full mt-3 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
            <Skeleton className="h-5 w-5 rounded-full mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
