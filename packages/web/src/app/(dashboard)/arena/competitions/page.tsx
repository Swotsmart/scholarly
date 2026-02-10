'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Search,
  Filter,
  ArrowLeft,
  Swords,
  Target,
  Flame,
  BarChart3,
  Loader2,
  Plus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { CompetitionCard, ArenaInsightPanel } from '@/components/arena';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { arenaApi } from '@/lib/arena-api';
import type { ArenaCompetition, UserCompetitionStats } from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'READING_SPRINT', label: 'Reading Sprint' },
  { value: 'ACCURACY_CHALLENGE', label: 'Accuracy Challenge' },
  { value: 'COMPREHENSION_QUIZ', label: 'Comprehension Quiz' },
  { value: 'WORD_BLITZ', label: 'Word Blitz' },
  { value: 'PHONICS_DUEL', label: 'Phonics Duel' },
  { value: 'TEAM_RELAY', label: 'Team Relay' },
  { value: 'STORY_SHOWDOWN', label: 'Story Showdown' },
  { value: 'SPELLING_BEE', label: 'Spelling Bee' },
  { value: 'VOCABULARY_CHALLENGE', label: 'Vocabulary Challenge' },
  { value: 'COLLABORATIVE_CREATION', label: 'Collaborative Creation' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const FORMAT_LABELS: Record<string, string> = {
  READING_SPRINT: 'Reading Sprint',
  ACCURACY_CHALLENGE: 'Accuracy Challenge',
  COMPREHENSION_QUIZ: 'Comprehension Quiz',
  WORD_BLITZ: 'Word Blitz',
  PHONICS_DUEL: 'Phonics Duel',
  TEAM_RELAY: 'Team Relay',
  STORY_SHOWDOWN: 'Story Showdown',
  SPELLING_BEE: 'Spelling Bee',
  VOCABULARY_CHALLENGE: 'Vocabulary Challenge',
  COLLABORATIVE_CREATION: 'Collaborative Creation',
};

// =============================================================================
// SKELETON
// =============================================================================

function CompetitionGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<ArenaCompetition[]>([]);
  const [userStats, setUserStats] = useState<UserCompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [compsRes, statsRes] = await Promise.all([
          arenaApi.listCompetitions(),
          arenaApi.getUserStats(),
        ]);

        if (compsRes.success) {
          setCompetitions(compsRes.data?.data ?? compsRes.data ?? []);
        }
        if (statsRes.success) {
          setUserStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to load competitions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const intelligence = useArenaIntelligence({
    context: 'competitions',
    competitions,
    userStats,
  });

  // Filtered competitions
  const filteredCompetitions = useMemo(() => {
    let result = [...competitions];

    if (formatFilter !== 'all') {
      result = result.filter((c) => c.format === formatFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          (c.description && c.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [competitions, formatFilter, statusFilter, searchQuery]);

  // Derived stats
  const winRate =
    userStats && userStats.totalCompetitions > 0
      ? Math.round((userStats.wins / userStats.totalCompetitions) * 100)
      : 0;

  const bestFormatLabel = userStats?.bestFormat
    ? FORMAT_LABELS[userStats.bestFormat] ?? userStats.bestFormat
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumb */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/arena">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Arena
          </Link>
        </Button>
        <PageHeader
          title="Competitions"
          description="Challenge yourself and your classmates"
          actions={
            <Button asChild>
              <Link href="/arena/competitions/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Competition
              </Link>
            </Button>
          }
        />
      </div>

      {/* Arena Insight Panel */}
      {!loading && (
        <ArenaInsightPanel
          insights={intelligence.insights}
          recommendations={intelligence.recommendations}
        />
      )}

      {/* User Stats Banner */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Wins"
            value={userStats?.wins ?? 0}
            icon={Trophy}
            variant="success"
            subtitle={`out of ${userStats?.totalCompetitions ?? 0} competitions`}
          />
          <StatsCard
            label="Average Score"
            value={userStats?.avgScore?.toFixed(1) ?? '0'}
            icon={BarChart3}
            variant="primary"
            subtitle="across all competitions"
          />
          <StatsCard
            label="Best Format"
            value={bestFormatLabel}
            icon={Target}
            variant="warning"
            subtitle="your strongest category"
          />
          <StatsCard
            label="Win Rate"
            value={`${winRate}%`}
            icon={Flame}
            variant={winRate >= 50 ? 'success' : 'error'}
            subtitle={
              userStats && userStats.activeCompetitions > 0
                ? `${userStats.activeCompetitions} active now`
                : 'no active competitions'
            }
          />
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(formatFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {filteredCompetitions.length} result{filteredCompetitions.length !== 1 ? 's' : ''}
              </span>
              {formatFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {FORMAT_OPTIONS.find((f) => f.value === formatFilter)?.label}
                  <button
                    onClick={() => setFormatFilter('all')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear format filter"
                  >
                    x
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear status filter"
                  >
                    x
                  </button>
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="secondary" className="text-xs">
                  &quot;{searchQuery}&quot;
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    x
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                onClick={() => {
                  setFormatFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competition Grid */}
      {loading ? (
        <CompetitionGridSkeleton />
      ) : filteredCompetitions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Swords className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-semibold">No competitions match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or search query to find competitions.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormatFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
              <Button size="sm" asChild>
                <Link href="/arena/competitions/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Competition
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
