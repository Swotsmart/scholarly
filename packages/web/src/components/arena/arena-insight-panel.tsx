'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trophy,
  Users,
  Target,
  Vote,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ArenaInsight, ArenaRecommendation } from '@/types/arena';
import Link from 'next/link';

interface ArenaInsightPanelProps {
  insights: ArenaInsight[];
  recommendations: ArenaRecommendation[];
  className?: string;
}

const urgencyBorderColors: Record<string, string> = {
  low: 'border-l-blue-400',
  medium: 'border-l-amber-400',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

const typeIcons: Record<string, LucideIcon> = {
  competition: Trophy,
  team: Users,
  bounty: Target,
  governance: Vote,
  token: Coins,
};

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

function confidenceVariant(confidence: number): 'default' | 'secondary' | 'outline' {
  if (confidence >= 0.8) return 'default';
  if (confidence >= 0.5) return 'secondary';
  return 'outline';
}

export function ArenaInsightPanel({ insights, recommendations, className }: ArenaInsightPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Arena Intelligence</span>
          {!expanded && (
            <Badge variant="secondary" className="text-[10px]">
              {insights.length + recommendations.length}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Insights
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {insights.map((insight) => (
                  <Link key={insight.id} href={insight.href} className="block">
                    <div
                      className={cn(
                        'rounded-md border border-l-4 p-3 hover:bg-muted/50 transition-colors',
                        urgencyBorderColors[insight.urgency] || 'border-l-gray-400'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {insight.label}
                        </span>
                        <span className="text-sm font-bold">
                          {insight.value}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {insight.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Recommendations
              </p>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => {
                  const Icon = typeIcons[rec.type] || Target;
                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <div className="rounded bg-muted p-1.5 mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{rec.title}</span>
                          <Badge
                            variant={confidenceVariant(rec.confidence)}
                            className="text-[10px] px-1.5"
                          >
                            {confidenceLabel(rec.confidence)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {rec.reason}
                        </p>
                        <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs" asChild>
                          <Link href={rec.action.href}>{rec.action.label}</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insights.length === 0 && recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No insights available yet. Keep competing to unlock intelligence.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
