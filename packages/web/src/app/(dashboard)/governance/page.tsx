'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Vote,
  Users,
  Wallet,
  Coins,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Timer,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Minus,
  PieChart,
  History,
  Shield,
  Plus,
  Search,
  UserCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const STATS = [
  { label: 'Active Proposals', value: '7', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Total Voting Power', value: '2.4M', icon: Vote, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Treasury Balance', value: '1.85M EDU', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Total Delegates', value: '142', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const ACTIVE_PROPOSALS = [
  {
    id: 'prop-001',
    title: 'Allocate 50,000 EDU for Indigenous Language Curriculum',
    proposer: 'Prof. Sarah Chen',
    category: 'curriculum',
    status: 'active' as const,
    forVotes: 156000,
    againstVotes: 42000,
    abstainVotes: 12000,
    quorum: 200000,
    timeRemaining: '2d 14h',
    createdAt: '24 Jan 2026',
    userVote: null as string | null,
  },
  {
    id: 'prop-002',
    title: 'Add Mandarin Immersion Module to LinguaFlow',
    proposer: 'Dr. James Nguyen',
    category: 'curriculum',
    status: 'active' as const,
    forVotes: 234000,
    againstVotes: 18000,
    abstainVotes: 8000,
    quorum: 200000,
    timeRemaining: '4d 6h',
    createdAt: '22 Jan 2026',
    userVote: 'for' as string | null,
  },
  {
    id: 'prop-003',
    title: 'Implement Cross-State Standards Mapping Engine',
    proposer: 'Michael Torres',
    category: 'technical',
    status: 'active' as const,
    forVotes: 89000,
    againstVotes: 112000,
    abstainVotes: 34000,
    quorum: 200000,
    timeRemaining: '1d 8h',
    createdAt: '20 Jan 2026',
    userVote: null as string | null,
  },
];

const VOTING_HISTORY = [
  {
    id: 'hist-001',
    title: 'Increase Validator Rewards by 15%',
    status: 'passed' as const,
    forVotes: 312000,
    againstVotes: 87000,
    abstainVotes: 21000,
    quorum: 200000,
    yourVote: 'for',
    completedAt: '18 Jan 2026',
  },
  {
    id: 'hist-002',
    title: 'Reduce Minimum Staking Period to 7 Days',
    status: 'rejected' as const,
    forVotes: 95000,
    againstVotes: 278000,
    abstainVotes: 15000,
    quorum: 200000,
    yourVote: 'against',
    completedAt: '15 Jan 2026',
  },
  {
    id: 'hist-003',
    title: 'Community Grants Programme for Rural Educators',
    status: 'executed' as const,
    forVotes: 398000,
    againstVotes: 34000,
    abstainVotes: 18000,
    quorum: 200000,
    yourVote: 'for',
    completedAt: '10 Jan 2026',
  },
  {
    id: 'hist-004',
    title: 'Launch Micro-School Accreditation Framework',
    status: 'passed' as const,
    forVotes: 287000,
    againstVotes: 56000,
    abstainVotes: 12000,
    quorum: 200000,
    yourVote: 'for',
    completedAt: '5 Jan 2026',
  },
  {
    id: 'hist-005',
    title: 'Expand Indigenous Language Support',
    status: 'executed' as const,
    forVotes: 345000,
    againstVotes: 23000,
    abstainVotes: 8000,
    quorum: 200000,
    yourVote: 'for',
    completedAt: '28 Dec 2025',
  },
];

const TOP_DELEGATES = [
  {
    id: 'del-001',
    name: 'Dr. Emily Watson',
    role: 'Education Policy Researcher',
    votingPower: 312000,
    participation: 96,
    delegators: 47,
    avatar: 'EW',
  },
  {
    id: 'del-002',
    name: 'Prof. Sarah Chen',
    role: 'Curriculum Design Lead',
    votingPower: 287000,
    participation: 92,
    delegators: 39,
    avatar: 'SC',
  },
  {
    id: 'del-003',
    name: 'Dr. James Nguyen',
    role: 'Multilingual Education Specialist',
    votingPower: 198000,
    participation: 88,
    delegators: 31,
    avatar: 'JN',
  },
  {
    id: 'del-004',
    name: 'Rachel O\'Brien',
    role: 'Rural Education Advocate',
    votingPower: 156000,
    participation: 94,
    delegators: 24,
    avatar: 'RO',
  },
];

const TREASURY_ALLOCATION = [
  { name: 'Curriculum Development', value: 35, amount: 647500, color: 'bg-blue-500' },
  { name: 'Infrastructure', value: 25, amount: 462500, color: 'bg-emerald-500' },
  { name: 'Community Grants', value: 20, amount: 370000, color: 'bg-purple-500' },
  { name: 'Operations', value: 15, amount: 277500, color: 'bg-amber-500' },
  { name: 'Reserve', value: 5, amount: 92500, color: 'bg-gray-500' },
];

const CATEGORY_COLORS: Record<string, string> = {
  curriculum: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  treasury: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  platform: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  policy: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  technical: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Active</Badge>;
    case 'passed':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Passed</Badge>;
    case 'executed':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Executed</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function GovernanceHubPage() {
  const [activeTab, setActiveTab] = useState('proposals');
  const [votes, setVotes] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    ACTIVE_PROPOSALS.forEach((p) => {
      initial[p.id] = p.userVote;
    });
    return initial;
  });
  const [delegateSearch, setDelegateSearch] = useState('');
  const [currentDelegate, setCurrentDelegate] = useState<string | null>('Dr. Emily Watson');

  const handleVote = (proposalId: string, voteType: string) => {
    setVotes((prev) => ({
      ...prev,
      [proposalId]: prev[proposalId] === voteType ? null : voteType,
    }));
  };

  const filteredDelegates = TOP_DELEGATES.filter(
    (d) =>
      d.name.toLowerCase().includes(delegateSearch.toLowerCase()) ||
      d.role.toLowerCase().includes(delegateSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Governance</h1>
          <p className="text-muted-foreground">
            Participate in decentralised governance of the Scholarly platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/governance/proposals/create">
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              New Proposal
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="proposals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Proposals</span>
          </TabsTrigger>
          <TabsTrigger value="voting" className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            <span className="hidden sm:inline">Voting</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="delegates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Delegates</span>
          </TabsTrigger>
          <TabsTrigger value="treasury" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Treasury</span>
          </TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Proposals</h2>
            <Link href="/governance/proposals">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {ACTIVE_PROPOSALS.map((proposal) => {
              const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
              const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
              const quorumPercent = Math.min((totalVotes / proposal.quorum) * 100, 100);

              return (
                <Card key={proposal.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {getStatusBadge(proposal.status)}
                          <Badge className={CATEGORY_COLORS[proposal.category]}>
                            {proposal.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {proposal.timeRemaining}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{proposal.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Proposed by {proposal.proposer} on {proposal.createdAt}
                        </p>
                      </div>
                    </div>

                    {/* Vote Progress Bar */}
                    <div className="space-y-2 mb-4">
                      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                        <div
                          className="bg-green-500 transition-all"
                          style={{ width: `${forPercent}%` }}
                        />
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${againstPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            For: {(proposal.forVotes / 1000).toFixed(0)}K
                          </span>
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            Against: {(proposal.againstVotes / 1000).toFixed(0)}K
                          </span>
                          <span className="font-medium">
                            Abstain: {(proposal.abstainVotes / 1000).toFixed(0)}K
                          </span>
                        </div>
                        <span>Quorum: {quorumPercent.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Link href={`/governance/proposals/${proposal.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Voting Tab */}
        <TabsContent value="voting" className="space-y-4">
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Cast Your Vote</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                You have {ACTIVE_PROPOSALS.length} active proposals requiring your vote. Your voting power: 24,500 EDU
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {ACTIVE_PROPOSALS.map((proposal) => {
              const userVote = votes[proposal.id];
              const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
              const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;

              return (
                <Card key={proposal.id} className={userVote ? 'border-primary/30' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={CATEGORY_COLORS[proposal.category]}>
                            {proposal.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {proposal.timeRemaining} remaining
                          </span>
                        </div>
                        <h3 className="font-semibold">{proposal.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Proposed by {proposal.proposer}
                        </p>
                      </div>
                    </div>

                    {/* Current Results */}
                    <div className="bg-muted/50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          For: {(proposal.forVotes / 1000).toFixed(0)}K ({forPercent.toFixed(1)}%)
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Against: {(proposal.againstVotes / 1000).toFixed(0)}K ({againstPercent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        <div className="bg-green-500" style={{ width: `${forPercent}%` }} />
                        <div className="bg-red-500" style={{ width: `${againstPercent}%` }} />
                      </div>
                    </div>

                    {/* Voting Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant={userVote === 'for' ? 'default' : 'outline'}
                        className={userVote === 'for' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        onClick={() => handleVote(proposal.id, 'for')}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        For
                      </Button>
                      <Button
                        variant={userVote === 'against' ? 'default' : 'outline'}
                        className={userVote === 'against' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                        onClick={() => handleVote(proposal.id, 'against')}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Against
                      </Button>
                      <Button
                        variant={userVote === 'abstain' ? 'default' : 'outline'}
                        onClick={() => handleVote(proposal.id, 'abstain')}
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        Abstain
                      </Button>
                      {userVote && (
                        <span className="text-sm text-muted-foreground ml-2">
                          <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-500" />
                          Vote recorded
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Historical Voting Records</h2>
            <Link href="/governance/proposals">
              <Button variant="outline" size="sm">
                View All Proposals
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Proposal</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">For / Against</th>
                      <th className="px-4 py-3 text-left font-medium">Your Vote</th>
                      <th className="px-4 py-3 text-left font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {VOTING_HISTORY.map((record) => {
                      const totalVotes = record.forVotes + record.againstVotes + record.abstainVotes;
                      const forPercent = totalVotes > 0 ? (record.forVotes / totalVotes) * 100 : 0;

                      return (
                        <tr key={record.id} className="hover:bg-muted/50">
                          <td className="px-4 py-4">
                            <p className="font-medium">{record.title}</p>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 rounded-full overflow-hidden bg-muted">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${forPercent}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {forPercent.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              className={
                                record.yourVote === 'for'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : record.yourVote === 'against'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : ''
                              }
                              variant={record.yourVote === 'abstain' ? 'secondary' : 'default'}
                            >
                              {record.yourVote === 'for' && <ThumbsUp className="h-3 w-3 mr-1" />}
                              {record.yourVote === 'against' && <ThumbsDown className="h-3 w-3 mr-1" />}
                              {record.yourVote === 'abstain' && <Minus className="h-3 w-3 mr-1" />}
                              {record.yourVote}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {record.completedAt}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {VOTING_HISTORY.filter((r) => r.status === 'passed' || r.status === 'executed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Passed Proposals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {VOTING_HISTORY.filter((r) => r.status === 'rejected').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Rejected Proposals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-purple-500/10 p-3">
                    <Vote className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {VOTING_HISTORY.filter((r) => r.yourVote).length}/{VOTING_HISTORY.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Your Participation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Delegates Tab */}
        <TabsContent value="delegates" className="space-y-4">
          {/* Current Delegation */}
          <Card className={currentDelegate ? 'border-purple-500/30' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Current Delegation
              </CardTitle>
              <CardDescription>
                Your voting power delegation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentDelegate ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-500">
                        {TOP_DELEGATES.find((d) => d.name === currentDelegate)?.avatar || 'DL'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{currentDelegate}</p>
                      <p className="text-sm text-muted-foreground">
                        Delegated 24,500 EDU voting power
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Since 15 Dec 2025 - 96% participation rate
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setCurrentDelegate(null)}>
                    Undelegate
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No active delegation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a delegate below to delegate your voting power
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delegate Directory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Delegates</CardTitle>
                  <CardDescription>Select a delegate to represent you</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search delegates..."
                    value={delegateSearch}
                    onChange={(e) => setDelegateSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredDelegates.map((delegate) => (
                  <Card key={delegate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{delegate.avatar}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold">{delegate.name}</p>
                            {currentDelegate === delegate.name && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Delegated
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{delegate.role}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <span>{(delegate.votingPower / 1000).toFixed(0)}K power</span>
                            <span>{delegate.delegators} delegators</span>
                            <span>{delegate.participation}% participation</span>
                          </div>
                          {currentDelegate !== delegate.name && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentDelegate(delegate.name)}
                            >
                              Delegate
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link href="/governance/delegates">
                  <Button variant="outline">
                    View All Delegates
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treasury Tab */}
        <TabsContent value="treasury" className="space-y-4">
          {/* Treasury Balance */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-500/10 p-4">
                    <Wallet className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Treasury Balance</p>
                    <p className="text-4xl font-bold">1,850,000</p>
                    <p className="text-sm font-medium text-muted-foreground">EDU Tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">124K</p>
                  <p className="text-sm text-muted-foreground">Monthly Income</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Activity className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">87K</p>
                  <p className="text-sm text-muted-foreground">Monthly Expense</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Allocation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Treasury Allocation
                  </CardTitle>
                  <CardDescription>Current fund distribution across categories</CardDescription>
                </div>
                <Link href="/governance/treasury">
                  <Button variant="outline" size="sm">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TREASURY_ALLOCATION.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${item.color}`} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {item.amount.toLocaleString()} EDU ({item.value}%)
                      </span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">Total Allocated</span>
                  <span className="font-bold">
                    {TREASURY_ALLOCATION.reduce((sum, i) => sum + i.amount, 0).toLocaleString()} EDU
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/governance/tokens">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-amber-500/10 p-3">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Token Economy</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage your EDU tokens, stake for rewards, and view your NFT credentials
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        4 staking pools, 8.2% avg APR
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/governance/proposals/create">
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <Plus className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Create Proposal</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submit a new proposal for community voting and treasury allocation
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        Requires 1,000 EDU staked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
