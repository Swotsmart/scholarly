'use client';

import { cn } from '@/lib/utils';

interface VoteProgressBarProps {
  votesFor: number;
  votesAgainst: number;
  votesAbstain?: number;
  showLabels?: boolean;
  className?: string;
}

export function VoteProgressBar({
  votesFor,
  votesAgainst,
  votesAbstain = 0,
  showLabels = false,
  className,
}: VoteProgressBarProps) {
  const total = votesFor + votesAgainst + votesAbstain;
  const forPct = total > 0 ? (votesFor / total) * 100 : 0;
  const againstPct = total > 0 ? (votesAgainst / total) * 100 : 0;
  const abstainPct = total > 0 ? (votesAbstain / total) * 100 : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {forPct > 0 && (
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${forPct}%` }}
          />
        )}
        {againstPct > 0 && (
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${againstPct}%` }}
          />
        )}
        {abstainPct > 0 && (
          <div
            className="bg-gray-400 dark:bg-gray-500 transition-all"
            style={{ width: `${abstainPct}%` }}
          />
        )}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />
            For: {votesFor} ({forPct.toFixed(1)}%)
          </span>
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />
            Against: {votesAgainst} ({againstPct.toFixed(1)}%)
          </span>
          {votesAbstain > 0 && (
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 mr-1" />
              Abstain: {votesAbstain} ({abstainPct.toFixed(1)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
