'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Users,
  ArrowLeft,
  Gavel,
  Timer,
  Play,
} from 'lucide-react';

const PROPOSALS = [
  {
    id: 'prop-001',
    title: 'Allocate 50,000 EDU for Indigenous Language Curriculum',
    proposer: 'Prof. Sarah Chen',
    category: 'curriculum',
    description: 'This proposal seeks funding to develop culturally responsive curriculum modules covering Aboriginal and Torres Strait Islander languages, integrating Elder knowledge with modern digital learning tools. The programme will initially target five language groups across NSW and QLD.',
    status: 'active' as const,
    forVotes: 156000,
    againstVotes: 42000,
    abstainVotes: 12000,
    totalVotingPower: 2400000,
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
    description: 'Proposal to integrate a comprehensive Mandarin Chinese immersion module within the LinguaFlow language learning platform. Includes speech recognition for tonal accuracy, character writing practice with stroke-order validation, and HSK-aligned assessment frameworks.',
    status: 'active' as const,
    forVotes: 234000,
    againstVotes: 18000,
    abstainVotes: 8000,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: '4d 6h',
    createdAt: '22 Jan 2026',
    userVote: 'for' as string | null,
  },
  {
    id: 'prop-003',
    title: 'Increase Validator Rewards by 15%',
    proposer: 'Dr. Emily Watson',
    category: 'treasury',
    description: 'Adjust the token reward structure for content validators to improve retention and attract qualified educators. Current validator attrition rate is 23% quarterly, which impacts content quality assurance timelines across all curriculum modules.',
    status: 'passed' as const,
    forVotes: 312000,
    againstVotes: 87000,
    abstainVotes: 21000,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: 'Ended',
    createdAt: '15 Jan 2026',
    userVote: 'for' as string | null,
  },
  {
    id: 'prop-004',
    title: 'Implement Cross-State Standards Mapping Engine',
    proposer: 'Michael Torres',
    category: 'technical',
    description: 'Build an automated mapping engine that aligns learning outcomes across ACARA, Victorian Curriculum, NSW Syllabus, and IB frameworks. The engine will use ML-based semantic matching to identify equivalent outcomes and generate compliance reports for multi-jurisdiction schools.',
    status: 'active' as const,
    forVotes: 89000,
    againstVotes: 112000,
    abstainVotes: 34000,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: '1d 8h',
    createdAt: '20 Jan 2026',
    userVote: null as string | null,
  },
  {
    id: 'prop-005',
    title: 'Reduce Minimum Staking Period to 7 Days',
    proposer: 'Alex Kim',
    category: 'policy',
    description: 'Lower the minimum staking period from 30 days to 7 days to improve liquidity and encourage broader participation in governance. Analysis shows that 62% of potential stakers cite the lock-up period as a barrier to entry.',
    status: 'rejected' as const,
    forVotes: 95000,
    againstVotes: 278000,
    abstainVotes: 15000,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: 'Ended',
    createdAt: '10 Jan 2026',
    userVote: 'against' as string | null,
  },
  {
    id: 'prop-006',
    title: 'Launch Micro-School Accreditation Framework',
    proposer: 'Dr. Priya Sharma',
    category: 'platform',
    description: 'Establish a decentralised accreditation framework for micro-schools using blockchain-verified credentials. This framework will enable micro-schools to gain recognised accreditation status through peer validation from established institutions within the Scholarly network.',
    status: 'pending' as const,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: 'Starts in 1d',
    createdAt: '26 Jan 2026',
    userVote: null as string | null,
  },
  {
    id: 'prop-007',
    title: 'Establish Community Grants Programme for Rural Educators',
    proposer: 'Rachel O\'Brien',
    category: 'treasury',
    description: 'Create a grants programme allocating 100,000 EDU annually to support rural and remote educators in adopting the Scholarly platform. Grants will cover professional development, hardware subsidies, and connectivity solutions for schools in underserved areas.',
    status: 'executed' as const,
    forVotes: 398000,
    againstVotes: 34000,
    abstainVotes: 18000,
    totalVotingPower: 2400000,
    quorum: 200000,
    timeRemaining: 'Executed',
    createdAt: '5 Jan 2026',
    userVote: 'for' as string | null,
  },
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
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>;
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

export default function ProposalsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [votes, setVotes] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    PROPOSALS.forEach((p) => {
      initial[p.id] = p.userVote;
    });
    return initial;
  });

  const filteredProposals = PROPOSALS.filter((p) => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  });

  const handleVote = (proposalId: string, voteType: string) => {
    setVotes((prev) => ({
      ...prev,
      [proposalId]: prev[proposalId] === voteType ? null : voteType,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/governance" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="heading-2">Proposals</h1>
          </div>
          <p className="text-muted-foreground">
            Browse, create, and vote on governance proposals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/governance/proposals/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Proposal
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{PROPOSALS.length}</p>
              <p className="text-sm text-muted-foreground">Total Proposals</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Timer className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{PROPOSALS.filter((p) => p.status === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active Votes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{PROPOSALS.filter((p) => p.status === 'passed' || p.status === 'executed').length}</p>
              <p className="text-sm text-muted-foreground">Passed / Executed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">89%</p>
              <p className="text-sm text-muted-foreground">Avg Participation</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="passed">Passed</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="executed">Executed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No proposals found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are no proposals matching this filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredProposals.map((proposal) => {
              const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
              const forPercent = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
              const againstPercent = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
              const abstainPercent = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;
              const quorumPercent = Math.min((totalVotes / proposal.quorum) * 100, 100);
              const userVote = votes[proposal.id];

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

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {proposal.description}
                    </p>

                    {/* Vote Tallies */}
                    {totalVotes > 0 && (
                      <div className="space-y-3 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              For
                            </span>
                            <span className="text-green-600 dark:text-green-400">
                              {(proposal.forVotes / 1000).toFixed(0)}K ({forPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${forPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" />
                              Against
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              {(proposal.againstVotes / 1000).toFixed(0)}K ({againstPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="h-full bg-red-500 rounded-full transition-all"
                              style={{ width: `${againstPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                              <Minus className="h-3 w-3" />
                              Abstain
                            </span>
                            <span className="text-muted-foreground">
                              {(proposal.abstainVotes / 1000).toFixed(0)}K ({abstainPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="h-full bg-gray-400 dark:bg-gray-600 rounded-full transition-all"
                              style={{ width: `${abstainPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span>Quorum: {quorumPercent.toFixed(0)}% reached ({(totalVotes / 1000).toFixed(0)}K / {(proposal.quorum / 1000).toFixed(0)}K)</span>
                          <span>{(totalVotes / 1000).toFixed(0)}K total votes</span>
                        </div>
                      </div>
                    )}

                    {proposal.status === 'pending' && (
                      <div className="bg-muted/50 rounded-lg p-4 mb-4 text-center">
                        <p className="text-sm text-muted-foreground">Voting has not started yet</p>
                        <p className="text-xs text-muted-foreground mt-1">{proposal.timeRemaining}</p>
                      </div>
                    )}

                    {/* Voting Buttons */}
                    {(proposal.status === 'active') && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant={userVote === 'for' ? 'default' : 'outline'}
                          size="sm"
                          className={userVote === 'for' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                          onClick={() => handleVote(proposal.id, 'for')}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          For
                        </Button>
                        <Button
                          variant={userVote === 'against' ? 'default' : 'outline'}
                          size="sm"
                          className={userVote === 'against' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                          onClick={() => handleVote(proposal.id, 'against')}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Against
                        </Button>
                        <Button
                          variant={userVote === 'abstain' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleVote(proposal.id, 'abstain')}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Abstain
                        </Button>
                        {userVote && (
                          <span className="text-xs text-muted-foreground ml-2">
                            You voted: {userVote}
                          </span>
                        )}
                      </div>
                    )}

                    {(proposal.status === 'passed' || proposal.status === 'rejected' || proposal.status === 'executed') && userVote && (
                      <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        You voted: <span className="font-medium capitalize">{userVote}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
