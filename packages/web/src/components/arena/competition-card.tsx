'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Clock, Swords, Zap, GraduationCap, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArenaCompetition, CompetitionFormat } from '@/types/arena';
import { isMathCompetitionFormat } from '@/types/arena';
import Link from 'next/link';

interface CompetitionCardProps {
  competition: ArenaCompetition;
  showJoinButton?: boolean;
}

export function CompetitionCard({ competition, showJoinButton = true }: CompetitionCardProps) {
  const statusColors: Record<string, string> = {
    SCHEDULED:           'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    REGISTRATION_OPEN:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    IN_PROGRESS:         'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    COMPLETED:           'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    CANCELLED:           'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const formatLabels: Record<string, string> = {
    READING_SPRINT:        'Reading Sprint',
    ACCURACY_CHALLENGE:    'Accuracy',
    COMPREHENSION_QUIZ:    'Comprehension',
    WORD_BLITZ:            'Word Blitz',
    PHONICS_DUEL:          'Phonics Duel',
    TEAM_RELAY:            'Team Relay',
    STORY_SHOWDOWN:        'Story Showdown',
    SPELLING_BEE:          'Spelling Bee',
    VOCABULARY_CHALLENGE:  'Vocabulary',
    COLLABORATIVE_CREATION:'Collaboration',
    // ── MathCanvas formats ─────────────────────────────────────
    MATH_CHALLENGE:        'Math Challenge',
    MATH_CONSTRUCTION:     'Math Construction',
    MATH_RELAY:            'Math Relay',
  };

  const isMath = isMathCompetitionFormat(competition.format);
  const canJoin = ['REGISTRATION_OPEN', 'IN_PROGRESS'].includes(competition.status);

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isMath
              ? <Calculator className="h-5 w-5 text-blue-500" />
              : <Swords className="h-5 w-5 text-orange-500" />
            }
            <CardTitle className="text-base font-semibold line-clamp-1">
              {competition.title}
            </CardTitle>
          </div>
          <Badge className={cn('text-xs', statusColors[competition.status] || '')}>
            {competition.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5" />
            {formatLabels[competition.format] || competition.format}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {competition.participantCount}/{competition.config.maxParticipants}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {competition.config.durationMinutes}min
          </span>
          {competition.wagerPool > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Zap className="h-3.5 w-3.5" />
              {competition.wagerPool} pool
            </span>
          )}
        </div>
        {competition.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {competition.description}
          </p>
        )}
        {competition.curriculumAlignments && competition.curriculumAlignments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {competition.curriculumAlignments.slice(0, 2).map((std) => (
              <Badge key={std.id} variant="outline" className="text-xs gap-1 bg-primary/5">
                <GraduationCap className="h-3 w-3" />
                {std.code}
              </Badge>
            ))}
          </div>
        )}
        {showJoinButton && canJoin && (
          isMath ? (
            <Link href={`/tools/mathcanvas?competitionId=${competition.id}&format=${competition.format}&mode=arena`}>
              <Button size="sm" className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Calculator className="h-3.5 w-3.5" />
                Open in MathCanvas
              </Button>
            </Link>
          ) : (
            <Link href={`/arena/competitions/${competition.id}`}>
              <Button size="sm" variant="outline" className="w-full">
                Join Competition
              </Button>
            </Link>
          )
        )}
        {showJoinButton && !canJoin && (
          <Link href={`/arena/competitions/${competition.id}`}>
            <Button size="sm" variant="ghost" className="w-full text-muted-foreground">
              View Details
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
