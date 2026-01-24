'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ============================================================================
// Base Skeleton Component (if not using shadcn)
// ============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

// ============================================================================
// Domain-Specific Skeletons
// ============================================================================

/**
 * Tutor Card Skeleton
 * Used in tutor search results
 */
export function TutorCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Skeleton className="h-16 w-16 rounded-full" />

          {/* Info */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>

          {/* Price */}
          <div className="text-right">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16 mt-1" />
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Booking Card Skeleton
 */
export function BookingCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-5 w-[180px]" />
            <Skeleton className="h-4 w-[120px]" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Session Card Skeleton
 */
export function SessionCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-3 w-[80px]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Content Item Skeleton
 * Used in content marketplace
 */
export function ContentItemSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="h-40 w-full rounded-none" />

      <CardContent className="p-4">
        {/* Type badge */}
        <Skeleton className="h-5 w-16 rounded-full mb-2" />

        {/* Title */}
        <Skeleton className="h-5 w-full mb-2" />

        {/* Creator */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-[80px]" />
        </div>

        {/* Rating & Downloads */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Stats Skeleton
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[80px]" />
                <Skeleton className="h-3 w-[60px]" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b">
        <div className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Profile Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
          <div className="flex gap-4 mt-3">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[120px]" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-[120px]" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

/**
 * Chat Message Skeleton
 */
export function ChatMessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className={cn('space-y-2 max-w-[70%]', isOwn && 'items-end')}>
        <Skeleton className={cn('h-4 w-[200px]', isOwn ? 'ml-auto' : '')} />
        <Skeleton className={cn('h-4 w-[150px]', isOwn ? 'ml-auto' : '')} />
      </div>
    </div>
  );
}

/**
 * Calendar Skeleton
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-[150px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>

      {/* Days */}
      {Array.from({ length: 5 }).map((_, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <Skeleton key={dayIndex} className="h-20 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Generic List Skeleton
// ============================================================================

interface ListSkeletonProps {
  count?: number;
  renderItem?: () => React.ReactNode;
  className?: string;
}

export function ListSkeleton({ count = 3, renderItem, className }: ListSkeletonProps) {
  const defaultRender = () => (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-3 w-[150px]" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );

  return (
    <div className={cn('space-y-0', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderItem ? renderItem() : defaultRender()}</div>
      ))}
    </div>
  );
}

export default {
  TutorCardSkeleton,
  BookingCardSkeleton,
  SessionCardSkeleton,
  ContentItemSkeleton,
  DashboardStatsSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  FormSkeleton,
  ChatMessageSkeleton,
  CalendarSkeleton,
  ListSkeleton,
};
