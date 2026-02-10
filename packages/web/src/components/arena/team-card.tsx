'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Flame, Coins, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArenaTeam } from '@/types/arena';
import Link from 'next/link';

interface TeamCardProps {
  team: ArenaTeam;
}

const typeLabels: Record<string, string> = {
  CLASSROOM: 'Classroom',
  SCHOOL_HOUSE: 'School House',
  GLOBAL_GUILD: 'Global Guild',
  FAMILY: 'Family',
};

export function TeamCard({ team }: TeamCardProps) {
  const xpProgress = ((team.xp % 1000) / 1000) * 100;

  return (
    <Link href={`/arena/teams/${team.id}`} className="block">
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold line-clamp-1">
                {team.name}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {typeLabels[team.type] || team.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Level {team.level}</span>
              <span className="text-xs text-muted-foreground">
                {team.xp % 1000} / 1000 XP
              </span>
            </div>
            <Progress value={xpProgress} className="h-2" />
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {team.memberCount}/{team.maxMembers}
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Coins className="h-3.5 w-3.5" />
              {team.treasurySparks}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {team.totalWins} wins
            </span>
            {team.streak > 0 && (
              <span className={cn(
                'flex items-center gap-1',
                'text-orange-600 dark:text-orange-400'
              )}>
                <Flame className="h-3.5 w-3.5" />
                {team.streak}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
