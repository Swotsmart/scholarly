'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight, ChevronRight, Clock, Play, Flame, Target, Star, Calendar,
  AlertTriangle, FileText, ClipboardCheck, Users, MessageSquare, TrendingUp,
  CreditCard, Shield, Activity, Sparkles,
} from 'lucide-react';
import type {
  QuickInsight, ContinuationItem, UpcomingEvent, ActionSuggestion, TimeContext,
} from '@/hooks/use-dashboard-intelligence';

// =============================================================================
// ICON MAP — resolves string icon names from the intelligence engine
// =============================================================================

const iconMap: Record<string, React.ElementType> = {
  Flame, Target, Star, Clock, Calendar, AlertTriangle, FileText,
  ClipboardCheck, Users, MessageSquare, TrendingUp, CreditCard,
  Shield, Activity, Sparkles,
};

function resolveIcon(name: string) {
  return iconMap[name] || Star;
}

// =============================================================================
// URGENCY COLORS
// =============================================================================

const urgencyColors: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-blue-600 dark:text-blue-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-red-600 dark:text-red-400',
};

const urgencyBg: Record<string, string> = {
  low: 'bg-muted/50',
  medium: 'bg-blue-500/10',
  high: 'bg-orange-500/10',
  critical: 'bg-red-500/10',
};

// =============================================================================
// HERO GREETING
// =============================================================================

interface HeroGreetingProps {
  time: TimeContext;
  avatarSlot?: React.ReactNode;
  statsSlot?: React.ReactNode;
}

export function HeroGreeting({ time, avatarSlot, statsSlot }: HeroGreetingProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {avatarSlot}
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {time.greeting}
            </h1>
            <p className="text-muted-foreground mt-1">{time.focusHint}</p>
          </div>
        </div>
        {statsSlot}
      </div>
    </div>
  );
}

// =============================================================================
// QUICK INSIGHTS GRID
// =============================================================================

interface InsightsGridProps {
  insights: QuickInsight[];
}

export function InsightsGrid({ insights }: InsightsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => {
        const Icon = resolveIcon(insight.icon);
        const Wrapper = insight.href ? Link : 'div';
        const wrapperProps = insight.href ? { href: insight.href } : {};

        return (
          <Wrapper key={insight.id} {...(wrapperProps as any)}>
            <Card className="group transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-2.5 ${urgencyBg[insight.urgency]}`}>
                    <Icon className={`h-5 w-5 ${urgencyColors[insight.urgency]}`} />
                  </div>
                  {insight.change !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {insight.change > 0 ? '+' : ''}{insight.change}%
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold tracking-tight">{insight.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.label}</p>
                </div>
              </CardContent>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
}

// =============================================================================
// CONTINUATIONS — "Pick up where you left off"
// =============================================================================

interface ContinuationsCardProps {
  items: ContinuationItem[];
  title?: string;
}

export function ContinuationsCard({ items, title = 'Continue Where You Left Off' }: ContinuationsCardProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <Link key={item.id} href={item.href}>
            <div className="group flex items-center gap-4 rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm">
              {/* Progress ring */}
              <div className="relative h-12 w-12 shrink-0">
                <svg className="h-12 w-12 -rotate-90">
                  <circle cx="24" cy="24" r="20" strokeWidth="3" stroke="currentColor" fill="none" className="text-muted/30" />
                  <circle cx="24" cy="24" r="20" strokeWidth="3" stroke="currentColor" fill="none"
                    strokeDasharray={`${item.progress * 1.257} 125.7`} strokeLinecap="round" className="text-primary" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {item.progress}%
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">{item.lastActivity}</span>
                  {item.nextStepMinutes && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{item.nextStepMinutes} min
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// UPCOMING EVENTS CARD
// =============================================================================

interface UpcomingEventsCardProps {
  events: UpcomingEvent[];
}

const eventTypeColors: Record<string, string> = {
  class: 'bg-blue-500',
  session: 'bg-green-500',
  deadline: 'bg-red-500',
  meeting: 'bg-purple-500',
  event: 'bg-orange-500',
};

export function UpcomingEventsCard({ events }: UpcomingEventsCardProps) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Coming Up
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.map((event) => {
          const Wrapper = event.href ? Link : 'div';
          const wrapperProps = event.href ? { href: event.href } : {};

          return (
            <Wrapper key={event.id} {...(wrapperProps as any)}>
              <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className={`h-2 w-2 rounded-full shrink-0 ${eventTypeColors[event.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </div>
                {event.urgent && (
                  <Badge variant="destructive" className="text-xs shrink-0">Urgent</Badge>
                )}
              </div>
            </Wrapper>
          );
        })}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SUGGESTED ACTIONS CARD
// =============================================================================

interface SuggestedActionsCardProps {
  suggestions: ActionSuggestion[];
}

export function SuggestedActionsCard({ suggestions }: SuggestedActionsCardProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Suggested Actions
        </CardTitle>
        <CardDescription>Based on your current context</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion) => {
          const Icon = resolveIcon(suggestion.icon);
          return (
            <Link key={suggestion.id} href={suggestion.href}>
              <div className="group flex items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/50 hover:shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0 transition-colors" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
