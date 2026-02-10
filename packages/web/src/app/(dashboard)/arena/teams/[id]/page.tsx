'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Shield,
  Flame,
  Coins,
  Gem,
  Zap,
  Trophy,
  Loader2,
  LogOut,
  ArrowLeftRight,
  Swords,
  ChevronLeft,
  ThumbsUp,
  ThumbsDown,
  Crown,
  UserCheck,
  User,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VoteProgressBar } from '@/components/arena';
import { arenaApi } from '@/lib/arena-api';
import { cn } from '@/lib/utils';
import type {
  ArenaTeam,
  ArenaTeamMember,
  ArenaTreasuryVote,
  ArenaTeamChallenge,
  ArenaTeamTrade,
  TokenType,
  TeamMemberRole,
} from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const typeLabels: Record<string, string> = {
  CLASSROOM: 'Classroom',
  SCHOOL_HOUSE: 'School House',
  GLOBAL_GUILD: 'Global Guild',
  FAMILY: 'Family',
};

const roleIcons: Record<TeamMemberRole, typeof Crown> = {
  CAPTAIN: Crown,
  VICE_CAPTAIN: UserCheck,
  MEMBER: User,
  COACH: GraduationCap,
};

const roleBadgeVariants: Record<TeamMemberRole, 'default' | 'secondary' | 'outline'> = {
  CAPTAIN: 'default',
  VICE_CAPTAIN: 'secondary',
  MEMBER: 'outline',
  COACH: 'secondary',
};

const challengeStatusIcons: Record<string, typeof CheckCircle2> = {
  PENDING: Clock,
  ACCEPTED: CheckCircle2,
  COMPLETED: Trophy,
  DECLINED: XCircle,
};

const tradeStatusColors: Record<string, string> = {
  PROPOSED: 'text-amber-600 dark:text-amber-400',
  COMPLETED: 'text-green-600 dark:text-green-400',
  EXPIRED: 'text-muted-foreground',
  REJECTED: 'text-red-600 dark:text-red-400',
};

// =============================================================================
// SKELETONS
// =============================================================================

function HeaderSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-40 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded bg-muted animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// DEMO DATA (treasury votes, challenges, trades)
// =============================================================================

const DEMO_TREASURY_VOTES: ArenaTreasuryVote[] = [
  {
    id: 'tvote_001',
    teamId: 'team_xyz456abc',
    tenantId: 'tenant_scholarly',
    proposerId: 'user_learner_1',
    description: 'Fund new team avatars from the treasury',
    tokenType: 'SPARKS',
    amount: 100,
    purpose: 'TEAM_UPGRADE',
    status: 'OPEN',
    votesFor: 8,
    votesAgainst: 3,
    totalVoters: 24,
    requiredApproval: 0.5,
    expiresAt: '2026-02-14T00:00:00Z',
    createdAt: '2026-02-09T10:00:00Z',
  },
  {
    id: 'tvote_002',
    teamId: 'team_xyz456abc',
    tenantId: 'tenant_scholarly',
    proposerId: 'user_learner_2',
    description: 'Enter the Victorian Schools Reading League tournament',
    tokenType: 'GEMS',
    amount: 50,
    purpose: 'COMPETITION_ENTRY',
    status: 'OPEN',
    votesFor: 15,
    votesAgainst: 2,
    totalVoters: 24,
    requiredApproval: 0.5,
    expiresAt: '2026-02-12T00:00:00Z',
    createdAt: '2026-02-08T14:00:00Z',
  },
];

const DEMO_CHALLENGES: ArenaTeamChallenge[] = [
  {
    id: 'ch_001',
    tenantId: 'tenant_scholarly',
    challengerTeamId: 'team_xyz456abc',
    challengedTeamId: 'team_vwx678yza',
    format: 'TEAM_RELAY',
    wagerAmount: 50,
    wagerTokenType: 'SPARKS',
    status: 'PENDING',
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'ch_002',
    tenantId: 'tenant_scholarly',
    challengerTeamId: 'team_def789ghi',
    challengedTeamId: 'team_xyz456abc',
    competitionId: 'comp_kl3m8n9p',
    format: 'READING_SPRINT',
    wagerAmount: 100,
    wagerTokenType: 'GEMS',
    status: 'ACCEPTED',
    createdAt: '2026-02-08T11:00:00Z',
  },
];

const DEMO_TRADES: ArenaTeamTrade[] = [
  {
    id: 'trade_001',
    tenantId: 'tenant_scholarly',
    proposerTeamId: 'team_def789ghi',
    recipientTeamId: 'team_xyz456abc',
    offerTokenType: 'GEMS',
    offerAmount: 30,
    requestTokenType: 'SPARKS',
    requestAmount: 120,
    message: 'Swap some Gems for Sparks to enter the upcoming relay?',
    status: 'PROPOSED',
    expiresAt: '2026-02-15T00:00:00Z',
    createdAt: '2026-02-09T16:00:00Z',
  },
  {
    id: 'trade_002',
    tenantId: 'tenant_scholarly',
    proposerTeamId: 'team_xyz456abc',
    recipientTeamId: 'team_jkl012mno',
    offerTokenType: 'SPARKS',
    offerAmount: 80,
    requestTokenType: 'GEMS',
    requestAmount: 25,
    status: 'COMPLETED',
    expiresAt: '2026-02-12T00:00:00Z',
    createdAt: '2026-02-06T10:00:00Z',
  },
];

const TEAM_NAME_MAP: Record<string, string> = {
  team_xyz456abc: 'Kookaburra Readers',
  team_def789ghi: 'Blue Tongue Bookworms',
  team_jkl012mno: 'Platypus Pioneers',
  team_pqr345stu: "The O'Brien Family Readers",
  team_vwx678yza: 'Wombat Warriors',
};

const FORMAT_LABELS: Record<string, string> = {
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

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function TeamDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [team, setTeam] = useState<ArenaTeam | null>(null);
  const [members, setMembers] = useState<ArenaTeamMember[]>([]);
  const [treasuryVotes, setTreasuryVotes] = useState<ArenaTreasuryVote[]>(DEMO_TREASURY_VOTES);
  const [challenges] = useState<ArenaTeamChallenge[]>(DEMO_CHALLENGES);
  const [trades, setTrades] = useState<ArenaTeamTrade[]>(DEMO_TRADES);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  // Contribute form state
  const [contributeToken, setContributeToken] = useState<TokenType>('SPARKS');
  const [contributeAmount, setContributeAmount] = useState<number>(10);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [teamRes, membersRes] = await Promise.all([
          arenaApi.getTeam(id),
          arenaApi.getTeamMembers(id),
        ]);
        if (teamRes.success && teamRes.data) setTeam(teamRes.data);
        if (membersRes.success && membersRes.data) setMembers(membersRes.data);
      } catch {
        // Failed to load team
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleLeave() {
    setLeaving(true);
    try {
      await arenaApi.leaveTeam(id);
    } catch {
      // Failed to leave team
    } finally {
      setLeaving(false);
    }
  }

  async function handleContribute() {
    if (contributeAmount <= 0) return;
    setContributing(true);
    try {
      const res = await arenaApi.contributeToTreasury(id, {
        tokenType: contributeToken,
        amount: contributeAmount,
      });
      if (res.success && res.data) {
        setTeam((prev) =>
          prev
            ? {
                ...prev,
                treasurySparks: res.data.treasurySparks ?? prev.treasurySparks,
                treasuryGems: res.data.treasuryGems ?? prev.treasuryGems,
              }
            : prev
        );
      }
    } catch {
      // Failed to contribute
    } finally {
      setContributing(false);
    }
  }

  async function handleVote(voteId: string, choice: 'FOR' | 'AGAINST') {
    try {
      const res = await arenaApi.castTreasuryVote(voteId, { choice });
      if (res.success) {
        setTreasuryVotes((prev) =>
          prev.map((v) =>
            v.id === voteId
              ? {
                  ...v,
                  votesFor: v.votesFor + (choice === 'FOR' ? 1 : 0),
                  votesAgainst: v.votesAgainst + (choice === 'AGAINST' ? 1 : 0),
                }
              : v
          )
        );
      }
    } catch {
      // Failed to cast vote
    }
  }

  async function handleAcceptTrade(tradeId: string) {
    try {
      const res = await arenaApi.acceptTrade(tradeId);
      if (res.success) {
        setTrades((prev) =>
          prev.map((t) => (t.id === tradeId ? { ...t, status: 'COMPLETED' as const } : t))
        );
      }
    } catch {
      // Failed to accept trade
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-1">Team Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This team may have been removed or the link is invalid.
        </p>
        <Button variant="outline" asChild>
          <Link href="/arena/teams">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Teams
          </Link>
        </Button>
      </div>
    );
  }

  const xpProgress = ((team.xp % 1000) / 1000) * 100;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/arena/teams">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Teams
        </Link>
      </Button>

      {/* Team Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
                <Badge variant="outline">{typeLabels[team.type] || team.type}</Badge>
              </div>
              {team.description && (
                <p className="text-sm text-muted-foreground max-w-lg">
                  {team.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {team.memberCount}/{team.maxMembers} members
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  {team.totalWins} wins / {team.totalCompetitions} played
                </span>
                {team.streak > 0 && (
                  <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                    <Flame className="h-4 w-4" />
                    {team.streak}-win streak
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-[200px] space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Level {team.level}</span>
                <span className="text-xs text-muted-foreground">
                  {team.xp % 1000} / 1,000 XP
                </span>
              </div>
              <Progress value={xpProgress} className="h-2.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-right">Contributed Sparks</th>
                      <th className="px-4 py-3 text-right">Games Played</th>
                      <th className="px-4 py-3 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const RoleIcon = roleIcons[member.role] || User;
                      return (
                        <tr
                          key={member.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {member.user?.avatarUrl ? (
                                <img
                                  src={member.user.avatarUrl}
                                  alt=""
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                                  {member.user?.displayName?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <span className="font-medium">
                                {member.user?.displayName || 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={roleBadgeVariants[member.role] || 'outline'}
                              className="text-xs gap-1"
                            >
                              <RoleIcon className="h-3 w-3" />
                              {member.role.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {member.contributedSparks.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {member.competitionsPlayed}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {member.competitionsWon}
                          </td>
                        </tr>
                      );
                    })}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No members yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLeave}
              disabled={leaving}
            >
              {leaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Leave Team
            </Button>
          </div>
        </TabsContent>

        {/* Treasury Tab */}
        <TabsContent value="treasury" className="space-y-4 mt-4">
          {/* Balance Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2.5">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Sparks Treasury
                  </p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                    {team.treasurySparks.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2.5">
                  <Gem className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Gems Treasury
                  </p>
                  <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    {team.treasuryGems.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribute Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contribute to Treasury</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Token Type
                  </label>
                  <Select
                    value={contributeToken}
                    onValueChange={(v) => setContributeToken(v as TokenType)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPARKS">Sparks</SelectItem>
                      <SelectItem value="GEMS">Gems</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Amount
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={contributeAmount}
                    onChange={(e) =>
                      setContributeAmount(parseInt(e.target.value) || 0)
                    }
                    className="w-[120px]"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleContribute}
                  disabled={contributing || contributeAmount <= 0}
                >
                  {contributing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="mr-2 h-4 w-4" />
                  )}
                  Contribute
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Treasury Votes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Active Treasury Votes</h3>
            {treasuryVotes.filter((v) => v.status === 'OPEN').length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
                <Coins className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No active treasury votes
                </p>
              </div>
            ) : (
              treasuryVotes
                .filter((v) => v.status === 'OPEN')
                .map((vote) => (
                  <Card key={vote.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{vote.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {vote.amount} {vote.tokenType} for {vote.purpose.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {vote.status}
                        </Badge>
                      </div>
                      <VoteProgressBar
                        votesFor={vote.votesFor}
                        votesAgainst={vote.votesAgainst}
                        showLabels
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          onClick={() => handleVote(vote.id, 'FOR')}
                        >
                          <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                          For
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => handleVote(vote.id, 'AGAINST')}
                        >
                          <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                          Against
                        </Button>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Expires {new Date(vote.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-4 mt-4">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Swords className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No challenges yet. Challenge another team to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => {
                const StatusIcon =
                  challengeStatusIcons[challenge.status] || AlertCircle;
                const isChallenger = challenge.challengerTeamId === id;
                const opponentId = isChallenger
                  ? challenge.challengedTeamId
                  : challenge.challengerTeamId;
                const opponentName = TEAM_NAME_MAP[opponentId] || 'Unknown Team';

                return (
                  <Card key={challenge.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusIcon
                            className={cn(
                              'h-5 w-5 shrink-0',
                              challenge.status === 'PENDING' && 'text-amber-500',
                              challenge.status === 'ACCEPTED' && 'text-green-500',
                              challenge.status === 'COMPLETED' && 'text-blue-500',
                              challenge.status === 'DECLINED' && 'text-red-500'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {isChallenger ? 'Challenged' : 'Challenged by'}{' '}
                              {opponentName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className="text-xs">
                                {FORMAT_LABELS[challenge.format] || challenge.format}
                              </Badge>
                              {challenge.wagerAmount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  Wager: {challenge.wagerAmount}{' '}
                                  {challenge.wagerTokenType || 'SPARKS'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            challenge.status === 'PENDING' && 'border-amber-300',
                            challenge.status === 'ACCEPTED' && 'border-green-300',
                            challenge.status === 'COMPLETED' && 'border-blue-300',
                            challenge.status === 'DECLINED' && 'border-red-300'
                          )}
                        >
                          {challenge.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4 mt-4">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No trades yet. Propose a trade with another team.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trades.map((trade) => {
                const isRecipient = trade.recipientTeamId === id;
                const otherTeamId = isRecipient
                  ? trade.proposerTeamId
                  : trade.recipientTeamId;
                const otherTeamName = TEAM_NAME_MAP[otherTeamId] || 'Unknown Team';

                return (
                  <Card key={trade.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            Trade with {otherTeamName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="font-medium text-green-600 dark:text-green-400">
                              Offer: {trade.offerAmount} {trade.offerTokenType}
                            </span>
                            <ArrowLeftRight className="h-3 w-3" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              Request: {trade.requestAmount} {trade.requestTokenType}
                            </span>
                          </div>
                          {trade.message && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              &ldquo;{trade.message}&rdquo;
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'text-xs font-medium',
                              tradeStatusColors[trade.status] || 'text-muted-foreground'
                            )}
                          >
                            {trade.status}
                          </span>
                          {isRecipient && trade.status === 'PROPOSED' && (
                            <Button
                              size="sm"
                              onClick={() => handleAcceptTrade(trade.id)}
                            >
                              Accept
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
