'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Gavel,
  Shield,
  Timer,
  Activity,
} from 'lucide-react';

const STATS = [
  { label: 'Active Proposals', value: '7', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Total Voting Power', value: '2.4M', icon: Vote, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Treasury Balance', value: '1.85M EDU', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Total Delegates', value: '142', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const FEATURE_CARDS = [
  {
    title: 'Proposals',
    description: 'Browse, create, and vote on governance proposals that shape the future of Scholarly.',
    icon: FileText,
    href: '/governance/proposals',
    stats: '7 active, 23 total',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    title: 'Delegates',
    description: 'Delegate your voting power or become a delegate to represent the community.',
    icon: Users,
    href: '/governance/delegates',
    stats: '142 delegates, 89% participation',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    title: 'Treasury',
    description: 'View treasury allocations, spending, and revenue streams for the DAO.',
    icon: Wallet,
    href: '/governance/treasury',
    stats: '1.85M EDU balance',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    title: 'Token Economy',
    description: 'Manage your EDU tokens, stake for rewards, and view your NFT credentials.',
    icon: Coins,
    href: '/governance/tokens',
    stats: '4 staking pools, 8.2% avg APR',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

const RECENT_ACTIVITY = [
  {
    id: 1,
    type: 'proposal_created',
    title: 'New proposal: Allocate 50,000 EDU for Indigenous Language Curriculum',
    actor: 'Prof. Sarah Chen',
    timestamp: '12 minutes ago',
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 2,
    type: 'vote_cast',
    title: 'Vote cast FOR "Add Mandarin Immersion Module"',
    actor: 'Dr. James Nguyen',
    timestamp: '34 minutes ago',
    icon: Vote,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 3,
    type: 'proposal_executed',
    title: 'Proposal executed: Increase Validator Rewards by 15%',
    actor: 'Governance Contract',
    timestamp: '2 hours ago',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    id: 4,
    type: 'delegation_changed',
    title: 'Voting power delegated to Dr. Emily Watson',
    actor: 'Michael Torres',
    timestamp: '3 hours ago',
    icon: Users,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    id: 5,
    type: 'proposal_rejected',
    title: 'Proposal rejected: Reduce Minimum Staking Period to 7 Days',
    actor: 'Governance Contract',
    timestamp: '5 hours ago',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    id: 6,
    type: 'treasury_allocation',
    title: 'Treasury allocation: 25,000 EDU to Community Grants Programme',
    actor: 'Treasury Multisig',
    timestamp: '8 hours ago',
    icon: Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 7,
    type: 'vote_cast',
    title: 'Vote cast AGAINST "Merge Standards Compliance Module"',
    actor: 'Dr. Priya Sharma',
    timestamp: '12 hours ago',
    icon: Vote,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
];

const ACTIVE_VOTE = {
  title: 'Allocate 50,000 EDU for Indigenous Language Curriculum',
  proposer: 'Prof. Sarah Chen',
  endTime: '2d 14h remaining',
  forVotes: 156000,
  againstVotes: 42000,
  abstainVotes: 12000,
  quorum: 200000,
  totalVotes: 210000,
};

export default function GovernanceHubPage() {
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

      {/* Active Voting Period Banner */}
      <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Timer className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Active Vote
                </Badge>
                <span className="text-sm text-muted-foreground">{ACTIVE_VOTE.endTime}</span>
              </div>
              <h3 className="font-semibold">{ACTIVE_VOTE.title}</h3>
              <p className="text-sm text-muted-foreground">Proposed by {ACTIVE_VOTE.proposer}</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    For: {(ACTIVE_VOTE.forVotes / 1000).toFixed(0)}K
                  </span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Against: {(ACTIVE_VOTE.againstVotes / 1000).toFixed(0)}K
                  </span>
                  <span className="text-muted-foreground font-medium">
                    Abstain: {(ACTIVE_VOTE.abstainVotes / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className="bg-green-500 transition-all"
                    style={{ width: `${(ACTIVE_VOTE.forVotes / ACTIVE_VOTE.totalVotes) * 100}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{ width: `${(ACTIVE_VOTE.againstVotes / ACTIVE_VOTE.totalVotes) * 100}%` }}
                  />
                  <div
                    className="bg-gray-400 transition-all"
                    style={{ width: `${(ACTIVE_VOTE.abstainVotes / ACTIVE_VOTE.totalVotes) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Quorum: {((ACTIVE_VOTE.totalVotes / ACTIVE_VOTE.quorum) * 100).toFixed(0)}% reached</span>
                  <Link href="/governance/proposals" className="text-primary hover:underline">
                    Vote now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {FEATURE_CARDS.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg ${card.bg} p-3`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{card.title}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">{card.stats}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Governance Activity
          </CardTitle>
          <CardDescription>Latest actions across the governance ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y">
            {RECENT_ACTIVITY.map((event) => (
              <div key={event.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className={`rounded-lg ${event.bg} p-2 mt-0.5`}>
                  <event.icon className={`h-4 w-4 ${event.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{event.actor}</span>
                    <span className="text-xs text-muted-foreground">-</span>
                    <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
