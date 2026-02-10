'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Loader2,
  Trophy,
  Target,
  Sparkles,
  Coins,
  Megaphone,
  Star,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Circle,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { arenaApi } from '@/lib/arena-api';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { ArenaInsightPanel } from '@/components/arena';
import type {
  LeaderboardEntry,
  CreatorProfile,
  OnboardingChecklist,
  CommunityFeedItem,
  CommunityHealthMetrics,
  ContentBounty,
} from '@/types/arena';

const tierColors: Record<string, string> = {
  NEWCOMER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  CONTRIBUTOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ESTABLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  EXPERT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MASTER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

type TokenTab = 'SPARKS' | 'GEMS' | 'VOICE';

export default function CommunityPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenTab>('SPARKS');
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [feed, setFeed] = useState<CommunityFeedItem[]>([]);
  const [health, setHealth] = useState<CommunityHealthMetrics | null>(null);
  const [bounties, setBounties] = useState<ContentBounty[]>([]);
  const [loading, setLoading] = useState(true);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regSpecs, setRegSpecs] = useState('');
  const [registering, setRegistering] = useState(false);

  const { insights, recommendations } = useArenaIntelligence({
    context: 'community',
    bounties,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [lbRes, profileRes, feedRes, healthRes, bountiesRes] =
          await Promise.all([
            arenaApi.getCommunityLeaderboards({ type: 'sparks' }),
            arenaApi.getMyCreatorProfile(),
            arenaApi.getCommunityFeed(),
            arenaApi.getCommunityHealth(),
            arenaApi.listBounties(),
          ]);

        if (lbRes.success && lbRes.data?.leaderboard) {
          setLeaderboard(lbRes.data.leaderboard);
        }
        if (profileRes.success && profileRes.data) {
          setCreatorProfile(profileRes.data);
          // Load checklist if profile exists
          try {
            const checkRes = await arenaApi.getCreatorChecklist(
              profileRes.data.id
            );
            if (checkRes.success && checkRes.data) {
              setChecklist(checkRes.data);
            }
          } catch {
            // Checklist load failed
          }
        }
        if (feedRes.success && feedRes.data?.feed) {
          setFeed(feedRes.data.feed);
        }
        if (healthRes.success && healthRes.data) {
          setHealth(healthRes.data);
        }
        if (bountiesRes.success && bountiesRes.data?.bounties) {
          setBounties(bountiesRes.data.bounties);
        }
      } catch {
        // Failed to load community data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleTokenTabChange = useCallback(async (token: TokenTab) => {
    setSelectedToken(token);
    try {
      const res = await arenaApi.getCommunityLeaderboards({
        type: token.toLowerCase(),
      });
      if (res.success && res.data?.leaderboard) {
        setLeaderboard(res.data.leaderboard);
      }
    } catch {
      // Leaderboard refresh failed
    }
  }, []);

  const handleRegister = useCallback(async () => {
    if (!regName.trim()) return;
    setRegistering(true);
    try {
      const res = await arenaApi.registerCreator({
        displayName: regName.trim(),
        bio: regBio.trim(),
        specialisations: regSpecs
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (res.success && res.data) {
        setCreatorProfile(res.data);
        setRegName('');
        setRegBio('');
        setRegSpecs('');
      }
    } catch {
      // Registration failed
    } finally {
      setRegistering(false);
    }
  }, [regName, regBio, regSpecs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community"
        description="Connect with fellow learners and creators"
        actions={
          <Users className="h-7 w-7 text-primary" />
        }
      />

      <ArenaInsightPanel insights={insights} recommendations={recommendations} />

      <Tabs defaultValue="leaderboards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* LEADERBOARDS TAB */}
        {/* ================================================================ */}
        <TabsContent value="leaderboards" className="space-y-4">
          <div className="flex items-center gap-2">
            {(['SPARKS', 'GEMS', 'VOICE'] as TokenTab[]).map((token) => (
              <Button
                key={token}
                size="sm"
                variant={selectedToken === token ? 'default' : 'outline'}
                onClick={() => handleTokenTabChange(token)}
              >
                {token === 'SPARKS' && (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {token === 'GEMS' && <Coins className="h-4 w-4 mr-1" />}
                {token === 'VOICE' && (
                  <Megaphone className="h-4 w-4 mr-1" />
                )}
                {token}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="pt-6">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No leaderboard data available yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-4 font-medium text-muted-foreground w-12">
                          Rank
                        </th>
                        <th className="pb-2 pr-4 font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="pb-2 font-medium text-muted-foreground text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaderboard.map((entry, index) => (
                        <tr key={entry.id}>
                          <td className="py-3 pr-4">
                            <span
                              className={cn(
                                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                                index === 0 &&
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                index === 1 &&
                                  'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                                index === 2 &&
                                  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                                index > 2 && 'text-muted-foreground'
                              )}
                            >
                              {entry.rank ?? index + 1}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              {entry.user?.avatarUrl ? (
                                <img
                                  src={entry.user.avatarUrl}
                                  alt=""
                                  className="h-6 w-6 rounded-full"
                                />
                              ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              <span className="font-medium">
                                {entry.user?.displayName || 'Anonymous'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right tabular-nums font-medium">
                            {entry.totalScore.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* CREATORS TAB */}
        {/* ================================================================ */}
        <TabsContent value="creators" className="space-y-6">
          {creatorProfile ? (
            <>
              {/* My creator profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-5 w-5 text-amber-500" />
                    My Creator Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {creatorProfile.displayName}
                      </h3>
                      {creatorProfile.bio && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {creatorProfile.bio}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'text-xs',
                          tierColors[creatorProfile.tier] || ''
                        )}
                      >
                        {creatorProfile.tier}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {creatorProfile.onboardingPhase.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">
                        {creatorProfile.totalPublished}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Published
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">
                        {creatorProfile.avgEngagement.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Engagement
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">
                        {creatorProfile.isVerifiedEducator ? 'Yes' : 'No'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Verified
                      </p>
                    </div>
                  </div>

                  {creatorProfile.specialisations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {creatorProfile.specialisations.map((spec) => (
                        <Badge
                          key={spec}
                          variant="secondary"
                          className="text-xs"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Onboarding checklist */}
              {checklist && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Creator Checklist
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {checklist.completionPercentage}%
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress
                      value={checklist.completionPercentage}
                      className="h-2"
                    />
                    <div className="space-y-2">
                      {checklist.steps.map((step) => (
                        <div
                          key={step.phase}
                          className={cn(
                            'flex items-center gap-3 rounded-md border p-3',
                            step.isCurrent && 'border-primary bg-primary/5'
                          )}
                        >
                          {step.isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              step.isComplete
                                ? 'text-muted-foreground'
                                : 'font-medium'
                            )}
                          >
                            {step.title}
                          </span>
                          {step.isCurrent && (
                            <Badge variant="default" className="ml-auto text-[10px]">
                              Current
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Become a Creator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Register as a content creator to publish stories, participate
                  in bounties, and earn rewards.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Display Name</label>
                    <Input
                      placeholder="Your creator name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Specialisations
                    </label>
                    <Input
                      placeholder="adventure, phonics, science (comma-separated)"
                      value={regSpecs}
                      onChange={(e) => setRegSpecs(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell others about yourself..."
                    value={regBio}
                    onChange={(e) => setRegBio(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={registering || !regName.trim()}
                >
                  {registering && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register as Creator
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* FEED TAB */}
        {/* ================================================================ */}
        <TabsContent value="feed" className="space-y-4">
          {feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Heart className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No community activity yet. Check back soon!
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {feed
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    )
                    .map((item, index) => {
                      const data = item.data as Record<string, unknown>;
                      return (
                        <div
                          key={`${item.type}-${index}`}
                          className="flex items-start gap-3 rounded-md border p-3"
                        >
                          <div
                            className={cn(
                              'rounded-md p-2 shrink-0',
                              item.type === 'competition'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : 'bg-emerald-100 dark:bg-emerald-900/30'
                            )}
                          >
                            {item.type === 'competition' ? (
                              <Trophy
                                className={cn(
                                  'h-4 w-4',
                                  'text-amber-600 dark:text-amber-400'
                                )}
                              />
                            ) : (
                              <Target
                                className={cn(
                                  'h-4 w-4',
                                  'text-emerald-600 dark:text-emerald-400'
                                )}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {String(data.title || 'Untitled')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {data.status != null && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {String(data.status)}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleDateString(
                                  undefined,
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* HEALTH TAB */}
        {/* ================================================================ */}
        <TabsContent value="health" className="space-y-6">
          {health ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                  label="Total Creators"
                  value={health.creators.total}
                  icon={Users}
                  variant="primary"
                />
                <StatsCard
                  label="Verified Educators"
                  value={health.creators.verified}
                  icon={ShieldCheck}
                  variant="success"
                />
                <StatsCard
                  label="Active Bounties"
                  value={health.content.activeBounties}
                  icon={Target}
                  variant="warning"
                />
                <StatsCard
                  label="Active Competitions"
                  value={health.competitions.active}
                  icon={Trophy}
                  variant="error"
                />
                <StatsCard
                  label="Total Users"
                  value={health.economy.totalUsers.toLocaleString()}
                  icon={Users}
                  variant="primary"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Economy Totals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {health.economy.totalSparks.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Sparks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Coins className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {health.economy.totalGems.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Gems
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Megaphone className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {health.economy.totalVoice.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Voice
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Coins className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-lg font-bold">
                          {health.economy.totalStaked.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total Staked
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Heart className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Community health data unavailable.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
