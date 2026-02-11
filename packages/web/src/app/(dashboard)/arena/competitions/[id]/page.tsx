'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Swords,
  Trophy,
  Users,
  Clock,
  Zap,
  Target,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  Send,
  Loader2,
  AlertCircle,
  BarChart3,
  Timer,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LeaderboardTable } from '@/components/arena';
import { arenaApi } from '@/lib/arena-api';
import type { ArenaCompetition, LeaderboardEntry } from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REGISTRATION_OPEN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

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

const SCORING_LABELS: Record<string, string> = {
  GROWTH_BASED: 'Growth-Based',
  ABSOLUTE: 'Absolute',
  HANDICAPPED: 'Handicapped',
  COLLABORATIVE: 'Collaborative',
};

// =============================================================================
// SKELETON
// =============================================================================

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-8 w-96 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          <div className="h-6 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="h-6 w-48 rounded bg-muted animate-pulse" />
            <div className="h-20 w-full rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function CompetitionDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [competition, setCompetition] = useState<ArenaCompetition | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Round submission form
  const [accuracy, setAccuracy] = useState([75]);
  const [wcpm, setWcpm] = useState('');
  const [comprehension, setComprehension] = useState([80]);

  useEffect(() => {
    async function loadData() {
      try {
        const [compRes, lbRes] = await Promise.all([
          arenaApi.getCompetition(id),
          arenaApi.getLeaderboard(id),
        ]);

        if (compRes.success && compRes.data) {
          setCompetition(compRes.data);
        } else {
          setNotFound(true);
        }

        if (lbRes.success) {
          setLeaderboard(lbRes.data ?? []);
        }
      } catch (err) {
        console.error('Failed to load competition:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await arenaApi.joinCompetition(id);
      if (res.success) {
        setJoinSuccess(true);
        // Refresh competition data
        const compRes = await arenaApi.getCompetition(id);
        if (compRes.success && compRes.data) {
          setCompetition(compRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to join competition:', err);
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitRound() {
    if (!wcpm.trim()) return;

    setSubmitting(true);
    try {
      const res = await arenaApi.submitRound(id, {
        accuracy: accuracy[0],
        wcpm: parseInt(wcpm, 10),
        comprehensionScore: comprehension[0],
      });
      if (res.success) {
        setSubmitDialogOpen(false);
        setWcpm('');
        setAccuracy([75]);
        setComprehension([80]);
        // Refresh leaderboard
        const lbRes = await arenaApi.getLeaderboard(id);
        if (lbRes.success) {
          setLeaderboard(lbRes.data ?? []);
        }
      }
    } catch (err) {
      console.error('Failed to submit round:', err);
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/arena/competitions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Competitions
          </Link>
        </Button>
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !competition) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/arena/competitions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Competitions
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-semibold text-lg">Competition not found</p>
            <p className="text-sm text-muted-foreground mt-1">
              This competition may have been removed or the link is incorrect.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/arena/competitions">Browse Competitions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const roundProgress =
    competition.totalRounds > 0
      ? (competition.currentRound / competition.totalRounds) * 100
      : 0;

  const spotsRemaining =
    competition.config.maxParticipants - competition.participantCount;

  const scheduledDate = competition.scheduledAt
    ? new Date(competition.scheduledAt).toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/arena/competitions">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Competitions
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={STATUS_COLORS[competition.status] || ''}>
            {competition.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline">
            {FORMAT_LABELS[competition.format] || competition.format}
          </Badge>
          {competition.phonicsPhase && (
            <Badge variant="outline">Phase {competition.phonicsPhase}</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {competition.title}
        </h1>
      </div>

      {/* Status-Aware Hero Section */}
      {competition.status === 'REGISTRATION_OPEN' && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Join this competition</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {spotsRemaining > 0
                      ? `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} remaining out of ${competition.config.maxParticipants}`
                      : 'This competition is full'}
                  </p>
                  {scheduledDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Starts: {scheduledDate}
                    </p>
                  )}
                </div>
              </div>
              {joinSuccess ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Joined</span>
                </div>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joining || spotsRemaining <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {joining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Join Competition
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {competition.status === 'IN_PROGRESS' && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <PlayCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Competition in progress</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Round {competition.currentRound} of {competition.totalRounds}
                  </p>
                </div>
              </div>
              <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Round
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Submit Round {competition.currentRound} Results</DialogTitle>
                    <DialogDescription>
                      Enter your reading performance for this round.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="accuracy">Accuracy</Label>
                        <span className="text-sm font-semibold text-primary">
                          {accuracy[0]}%
                        </span>
                      </div>
                      <Slider
                        id="accuracy"
                        min={0}
                        max={100}
                        step={1}
                        value={accuracy}
                        onValueChange={setAccuracy}
                      />
                      <p className="text-xs text-muted-foreground">
                        Percentage of words read correctly
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wcpm">Words Correct Per Minute (WCPM)</Label>
                      <Input
                        id="wcpm"
                        type="number"
                        min={0}
                        max={500}
                        placeholder="e.g. 120"
                        value={wcpm}
                        onChange={(e) => setWcpm(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your reading fluency score
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="comprehension">Comprehension Score</Label>
                        <span className="text-sm font-semibold text-primary">
                          {comprehension[0]}%
                        </span>
                      </div>
                      <Slider
                        id="comprehension"
                        min={0}
                        max={100}
                        step={1}
                        value={comprehension}
                        onValueChange={setComprehension}
                      />
                      <p className="text-xs text-muted-foreground">
                        How well you understood the passage
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSubmitDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitRound}
                      disabled={submitting || !wcpm.trim()}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {competition.status === 'COMPLETED' && (
        <Card className="border-gray-500/30 bg-gray-50/50 dark:bg-gray-950/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-gray-500/10 p-3">
                <Trophy className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Competition complete</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  All {competition.totalRounds} rounds have been completed.
                  {leaderboard.length > 0 && (
                    <> Winner: <span className="font-medium text-foreground">{leaderboard[0]?.user?.displayName ?? 'Unknown'}</span> with {leaderboard[0]?.totalScore?.toLocaleString()} points.</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Competition Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Competition Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {competition.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-sm">{competition.description}</p>
              </div>
            )}

            {competition.curriculumAlignments && competition.curriculumAlignments.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Curriculum Alignment
                </p>
                <div className="space-y-2">
                  {competition.curriculumAlignments.map((std) => (
                    <div key={std.id} className="flex items-start gap-2 rounded-md border bg-primary/5 p-2.5 text-sm">
                      <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <div>
                        <div className="font-medium text-sm">{std.code} — {std.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {std.learningArea} &middot; {std.subject} &middot; Year {std.yearLevels.join(', ')}
                        </div>
                        {std.description && (
                          <p className="text-xs text-muted-foreground mt-1">{std.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Scoring Model
                </p>
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {SCORING_LABELS[competition.config.scoringModel] || competition.config.scoringModel}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Duration
                </p>
                <div className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {competition.config.durationMinutes} minutes
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Max Participants
                </p>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {competition.config.maxParticipants}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Total Rounds
                </p>
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{competition.totalRounds}</span>
                </div>
              </div>
            </div>

            {competition.wagerPool > 0 && (
              <div className="rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">
                    Wager Pool: {competition.wagerPool.toLocaleString()}{' '}
                    {competition.wagerTokenType || 'tokens'}
                  </span>
                </div>
              </div>
            )}

            {competition.config.prizePool && (
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Prize Pool
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {competition.config.prizePool.xp != null && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      {competition.config.prizePool.xp} XP
                    </span>
                  )}
                  {competition.config.prizePool.tokens != null && (
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-purple-500" />
                      {competition.config.prizePool.tokens} tokens
                    </span>
                  )}
                  {competition.config.prizePool.badges &&
                    competition.config.prizePool.badges.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-blue-500" />
                        {competition.config.prizePool.badges.length} badge{competition.config.prizePool.badges.length !== 1 ? 's' : ''}
                      </span>
                    )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Progress & Participants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Round Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Round Progress</span>
                <span className="font-medium">
                  {competition.currentRound} / {competition.totalRounds}
                </span>
              </div>
              <Progress value={roundProgress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {competition.status === 'COMPLETED'
                  ? 'All rounds completed'
                  : competition.status === 'IN_PROGRESS'
                    ? `Currently on round ${competition.currentRound}`
                    : 'Competition has not started yet'}
              </p>
            </div>

            {/* Participant Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Participants</span>
                <span className="font-medium">
                  {competition.participantCount} / {competition.config.maxParticipants}
                </span>
              </div>
              <Progress
                value={
                  competition.config.maxParticipants > 0
                    ? (competition.participantCount / competition.config.maxParticipants) * 100
                    : 0
                }
                className="h-3"
              />
              <p className="text-xs text-muted-foreground">
                {spotsRemaining > 0
                  ? `${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} available`
                  : 'Competition is full'}
              </p>
            </div>

            {/* Schedule Info */}
            {scheduledDate && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {competition.status === 'COMPLETED' ? 'Completed' : 'Scheduled'}
                    </p>
                    <p className="text-sm font-medium">{scheduledDate}</p>
                  </div>
                </div>
              </div>
            )}

            {competition.startedAt && (
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Started
                    </p>
                    <p className="text-sm font-medium">
                      {new Date(competition.startedAt).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable entries={leaderboard} />
        </CardContent>
      </Card>
    </div>
  );
}
