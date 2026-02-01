'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Status =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'error'
  | 'syncing'
  | 'completed'
  | 'draft'
  | 'running'
  | 'failed'
  | 'connected'
  | 'disconnected'
  | 'compliant'
  | 'partial'
  | 'non-compliant'
  | 'warning'
  | 'configured'
  | 'not-configured';

const statusConfig: Record<Status, { label: string; className: string }> = {
  // Green variants
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  connected: {
    label: 'Connected',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  compliant: {
    label: 'Compliant',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  configured: {
    label: 'Configured',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  // Amber/Yellow variants
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  // Red variants
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  'non-compliant': {
    label: 'Non-Compliant',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  // Blue variants
  syncing: {
    label: 'Syncing',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  // Gray variants
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  'not-configured': {
    label: 'Not Configured',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
};

interface StatusBadgeProps {
  /** The status to display */
  status: Status;
  /** Custom label (overrides default) */
  label?: string;
  /** Additional className */
  className?: string;
  /** Show a pulsing dot indicator */
  showDot?: boolean;
}

export function StatusBadge({
  status,
  label,
  className,
  showDot = false,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const isAnimated = status === 'syncing' || status === 'running';

  return (
    <Badge
      variant="outline"
      className={cn('border-0 font-medium', config.className, className)}
    >
      {showDot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            status === 'active' || status === 'completed' || status === 'connected' || status === 'compliant' || status === 'configured'
              ? 'bg-green-500'
              : status === 'pending' || status === 'partial' || status === 'warning'
                ? 'bg-amber-500'
                : status === 'error' || status === 'failed' || status === 'disconnected' || status === 'non-compliant'
                  ? 'bg-red-500'
                  : status === 'syncing' || status === 'running'
                    ? 'bg-blue-500'
                    : 'bg-gray-500',
            isAnimated && 'animate-pulse'
          )}
        />
      )}
      {label || config.label}
    </Badge>
  );
}

export type { Status };
