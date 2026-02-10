'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Clock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentBounty } from '@/types/arena';
import Link from 'next/link';

interface BountyCardProps {
  bounty: ContentBounty;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  PUBLISHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ACCEPTING: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  JUDGING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const categoryLabels: Record<string, string> = {
  PHASE_GAP: 'Phase Gap',
  THEME_GAP: 'Theme Gap',
  LANGUAGE_GAP: 'Language Gap',
  SERIES_EXTENSION: 'Series Extension',
  CULTURAL_DIVERSITY: 'Cultural Diversity',
  SEASONAL: 'Seasonal',
  COMMUNITY_REQUEST: 'Community Request',
};

export function BountyCard({ bounty }: BountyCardProps) {
  const now = new Date();
  const deadline = new Date(bounty.submissionDeadline);
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const submissionProgress = bounty.maxSubmissions > 0
    ? (bounty.currentSubmissions / bounty.maxSubmissions) * 100
    : 0;

  const reward = bounty.reward as { amount?: number; tokenType?: string };

  return (
    <Link href={`/arena/bounties/${bounty.id}`} className="block">
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base font-semibold line-clamp-1">
                {bounty.title}
              </CardTitle>
            </div>
            <Badge className={cn('text-xs', statusColors[bounty.status] || '')}>
              {bounty.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {categoryLabels[bounty.category] || bounty.category}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}
            </span>
            {reward.amount != null && (
              <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                <Award className="h-3.5 w-3.5" />
                {reward.amount} {reward.tokenType || 'tokens'}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Submissions</span>
              <span>{bounty.currentSubmissions}/{bounty.maxSubmissions}</span>
            </div>
            <Progress value={submissionProgress} className="h-1.5" />
          </div>

          {bounty.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bounty.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
