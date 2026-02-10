'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Swords,
  Trophy,
  Users,
  Coins,
  Shield,
  Target,
  Vote,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { CompetitionCard, ArenaInsightPanel, TeamCard, BountyCard, TokenBalanceCard } from '@/components/arena';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { arenaApi } from '@/lib/arena-api';
import type {
  ArenaCompetition,
  TokenBalance,
  ArenaTeam,
  ArenaProposal,
  ContentBounty,
  UserCompetitionStats,
} from '@/types/arena';

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

function StatsSkeleton() {
  return (
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
  );
}

function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// QUICK LINK DATA
// =============================================================================

const QUICK_LINKS = [
  {
    title: 'Competitions',
    description: 'Browse and join reading challenges',
    icon: Swords,
    href: '/arena/competitions',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    title: 'Teams',
    description: 'Join or manage your learning teams',
    icon: Shield,
    href: '/arena/teams',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    title: 'Token Economy',
    description: 'Manage Sparks, Gems, and Voice tokens',
    icon: Coins,
    href: '/arena/tokens',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    title: 'Governance',
    description: 'Vote on community proposals',
    icon: Vote,
    href: '/arena/governance',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
];

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function ArenaHubPage() {
  const [competitions, setCompetitions] = useState<ArenaCompetition[]>([]);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [teams, setTeams] = useState<ArenaTeam[]>([]);
  const [proposals, setProposals] = useState<ArenaProposal[]>([]);
  const [bounties, setBounties] = useState<ContentBounty[]>([]);
  const [userStats, setUserStats] = useState<UserCompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function loadData() {
      try {
        const [
          compsRes,
          balanceRes,
          teamsRes,
          proposalsRes,
          bountiesRes,
          statsRes,
        ] = await Promise.all([
          arenaApi.listCompetitions(),
          arenaApi.getTokenBalance(),
          arenaApi.getMyTeams(),
          arenaApi.listProposals(),
          arenaApi.listBounties(),
          arenaApi.getUserStats(),
        ]);

        if (compsRes.success) setCompetitions(compsRes.data?.competitions ?? []);
        if (balanceRes.success) setTokenBalance(balanceRes.data);
        if (teamsRes.success) setTeams(teamsRes.data ?? []);
        if (proposalsRes.success) setProposals(proposalsRes.data?.proposals ?? []);
        if (bountiesRes.success) setBounties(bountiesRes.data?.bounties ?? []);
        if (statsRes.success) setUserStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load arena data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const intelligence = useArenaIntelligence({
    context: 'hub',
    competitions,
    tokenBalance,
    teams,
    proposals,
    bounties,
    userStats,
  });

  // Derived values
  const activeCompetitions = competitions.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'REGISTRATION_OPEN'
  );
  const bestTeam = teams.reduce<ArenaTeam | null>(
    (best, t) => (!best || t.level > best.level ? t : best),
    null
  );
  const winRate =
    userStats && userStats.totalCompetitions > 0
      ? Math.round((userStats.wins / userStats.totalCompetitions) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Arena"
        description="Compete, earn, and collaborate"
        actions={
          <Button asChild>
            <Link href="/arena/competitions">
              <Swords className="mr-2 h-4 w-4" />
              Browse Competitions
            </Link>
          </Button>
        }
      />

      {/* AI Greeting Banner */}
      {!loading && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{intelligence.greeting}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Arena Intelligence has {intelligence.insights.length} insight{intelligence.insights.length !== 1 ? 's' : ''} and{' '}
                  {intelligence.recommendations.length} recommendation{intelligence.recommendations.length !== 1 ? 's' : ''} for you.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href={intelligence.nextBestAction.href}>
                {intelligence.nextBestAction.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Arena Insight Panel */}
      {!loading && (
        <ArenaInsightPanel
          insights={intelligence.insights}
          recommendations={intelligence.recommendations}
        />
      )}

      {/* Stats Grid */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Active Competitions"
            value={activeCompetitions.length}
            icon={Swords}
            variant="warning"
            subtitle={`${competitions.length} total`}
          />
          <StatsCard
            label="My Sparks"
            value={tokenBalance?.sparks?.toLocaleString() ?? '0'}
            icon={Coins}
            variant="warning"
            subtitle={tokenBalance ? `${tokenBalance.gems} Gems, ${tokenBalance.voice} Voice` : undefined}
          />
          <StatsCard
            label="Team Level"
            value={bestTeam?.level ?? 0}
            icon={Shield}
            variant="primary"
            subtitle={bestTeam ? bestTeam.name : 'No teams yet'}
          />
          <StatsCard
            label="Win Rate"
            value={`${winRate}%`}
            icon={Trophy}
            variant="success"
            subtitle={
              userStats
                ? `${userStats.wins} wins / ${userStats.totalCompetitions} played`
                : 'No competitions yet'
            }
          />
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="competitions" className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            <span className="hidden sm:inline">Competitions</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Teams</span>
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Tokens</span>
          </TabsTrigger>
          <TabsTrigger value="bounties" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Bounties</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* AI Recommendations */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Recommended for You</h2>
              {loading ? (
                <CardGridSkeleton count={2} />
              ) : intelligence.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {intelligence.recommendations.map((rec, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{rec.title}</span>
                              <Badge variant="secondary" className="text-[10px]">
                                {rec.confidence}% match
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          </div>
                          <Button variant="ghost" size="sm" asChild className="ml-2 shrink-0">
                            <Link href={rec.action.href}>
                              {rec.action.label}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Join some competitions to unlock personalised recommendations.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Quick Links</h2>
              <div className="grid gap-3 grid-cols-2">
                {QUICK_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className={`rounded-lg ${link.bg} p-2.5 w-fit mb-3`}>
                          <link.icon className={`h-5 w-5 ${link.color}`} />
                        </div>
                        <h3 className="font-semibold text-sm">{link.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {link.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Competitions Tab */}
        <TabsContent value="competitions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Competitions</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/arena/competitions">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CardGridSkeleton />
          ) : activeCompetitions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCompetitions.slice(0, 6).map((comp) => (
                <CompetitionCard key={comp.id} competition={comp} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No active competitions right now</p>
                <p className="text-xs mt-1">Check back soon or create your own.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Teams</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/arena/teams">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CardGridSkeleton />
          ) : teams.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {teams.map((team) => (
                <div key={team.id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
                  <TeamCard team={team} />
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">You are not in any teams yet</p>
                <p className="text-xs mt-1">
                  Join a team to participate in team competitions and earn bonus rewards.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/arena/teams">Find Teams</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Token Balance</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/arena/tokens">
                Manage Tokens
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CardGridSkeleton />
          ) : tokenBalance ? (
            <div className="grid gap-4 md:grid-cols-3">
              <TokenBalanceCard
                tokenType="sparks"
                available={tokenBalance.sparks}
                staked={tokenBalance.stakedSparks}
                lifetime={tokenBalance.lifetimeSparksEarned}
              />
              <TokenBalanceCard
                tokenType="gems"
                available={tokenBalance.gems}
                staked={tokenBalance.stakedGems}
                lifetime={tokenBalance.lifetimeGemsEarned}
              />
              <TokenBalanceCard
                tokenType="voice"
                available={tokenBalance.voice}
                staked={tokenBalance.stakedVoice}
                lifetime={tokenBalance.lifetimeVoiceEarned}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No token balance available</p>
                <p className="text-xs mt-1">
                  Start competing to earn Sparks, Gems, and Voice tokens.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bounties Tab */}
        <TabsContent value="bounties" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Content Bounties</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/arena/bounties">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <CardGridSkeleton />
          ) : bounties.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bounties
                .filter((b) => b.status === 'ACCEPTING' || b.status === 'PUBLISHED')
                .slice(0, 6)
                .map((bounty) => (
                  <BountyCard key={bounty.id} bounty={bounty} />
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No bounties available</p>
                <p className="text-xs mt-1">
                  Content bounties reward you for creating learning materials.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
