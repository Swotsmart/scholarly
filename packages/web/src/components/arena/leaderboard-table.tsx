'use client';

import { Medal, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/arena';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  showFormat?: boolean;
}

const medalColors: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-700 dark:text-amber-600',
};

const formatLabels: Record<string, string> = {
  READING_SPRINT: 'Reading Sprint',
  ACCURACY_CHALLENGE: 'Accuracy',
  COMPREHENSION_QUIZ: 'Comprehension',
  WORD_BLITZ: 'Word Blitz',
  PHONICS_DUEL: 'Phonics Duel',
  TEAM_RELAY: 'Team Relay',
  STORY_SHOWDOWN: 'Story Showdown',
  SPELLING_BEE: 'Spelling Bee',
  VOCABULARY_CHALLENGE: 'Vocabulary',
  COLLABORATIVE_CREATION: 'Collaboration',
};

export function LeaderboardTable({ entries, currentUserId, showFormat = false }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-3 w-12">Rank</th>
            <th className="pb-2 pr-3">User</th>
            <th className="pb-2 pr-3 text-right">Score</th>
            {showFormat && <th className="pb-2 text-right">Format</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = currentUserId && entry.userId === currentUserId;
            return (
              <tr
                key={entry.id}
                className={cn(
                  'border-b last:border-0 transition-colors',
                  isCurrentUser
                    ? 'bg-primary/5 dark:bg-primary/10'
                    : 'hover:bg-muted/50'
                )}
              >
                <td className="py-2.5 pr-3">
                  <div className="flex items-center justify-center w-8">
                    {entry.rank <= 3 ? (
                      <Medal className={cn('h-4.5 w-4.5', medalColors[entry.rank])} />
                    ) : (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        {entry.rank}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    {entry.user?.avatarUrl ? (
                      <img
                        src={entry.user.avatarUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        {entry.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className={cn(
                      'font-medium truncate max-w-[160px]',
                      isCurrentUser && 'text-primary'
                    )}>
                      {entry.user?.displayName || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">
                  {entry.totalScore.toLocaleString()}
                </td>
                {showFormat && (
                  <td className="py-2.5 text-right text-muted-foreground">
                    {formatLabels[entry.type] || entry.type}
                  </td>
                )}
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td
                colSpan={showFormat ? 4 : 3}
                className="py-8 text-center text-muted-foreground"
              >
                No entries yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
