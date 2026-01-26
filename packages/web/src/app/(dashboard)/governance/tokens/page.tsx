'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Coins,
  Wallet,
  Lock,
  Gift,
  Image,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Shield,
  Zap,
  BookOpen,
  GraduationCap,
  Users,
  Vote,
  Award,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

const TOKEN_BALANCE = {
  total: 32700,
  available: 8200,
  staked: 24500,
  locked: 0,
  pendingRewards: 1847,
};

const TRANSACTION_HISTORY = [
  { id: 'th-001', date: '27 Jan 2026', type: 'Staking Reward', description: 'Governance Pool weekly reward', amount: 245, direction: 'in' as const },
  { id: 'th-002', date: '25 Jan 2026', type: 'Transfer', description: 'Delegation reward from community', amount: 120, direction: 'in' as const },
  { id: 'th-003', date: '23 Jan 2026', type: 'Stake', description: 'Staked to Governance Pool', amount: -5000, direction: 'out' as const },
  { id: 'th-004', date: '20 Jan 2026', type: 'Learning Reward', description: 'Completed Advanced STEM Module', amount: 500, direction: 'in' as const },
  { id: 'th-005', date: '18 Jan 2026', type: 'Tutoring Reward', description: 'Tutoring session (4 hours)', amount: 320, direction: 'in' as const },
  { id: 'th-006', date: '15 Jan 2026', type: 'Validation Reward', description: 'Validated 12 curriculum items', amount: 180, direction: 'in' as const },
  { id: 'th-007', date: '12 Jan 2026', type: 'NFT Purchase', description: 'Minted "VR Chemistry Lab" credential', amount: -250, direction: 'out' as const },
  { id: 'th-008', date: '10 Jan 2026', type: 'Governance Reward', description: 'Voted on 3 proposals', amount: 75, direction: 'in' as const },
];

const STAKING_POOLS = [
  {
    id: 'pool-governance',
    name: 'Governance Pool',
    description: 'Stake to earn governance voting power and participate in DAO decision-making',
    apr: 8,
    totalStaked: 845000,
    lockPeriod: '30 days',
    minStake: 1000,
    yourStake: 15000,
    icon: Vote,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    id: 'pool-validator',
    name: 'Validator Pool',
    description: 'Stake to become a content validator and earn rewards for quality assurance',
    apr: 12,
    totalStaked: 523000,
    lockPeriod: '60 days',
    minStake: 5000,
    yourStake: 9500,
    icon: Shield,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'pool-tutor',
    name: 'Tutor Pool',
    description: 'Stake to access premium tutoring opportunities and earn session bonuses',
    apr: 6,
    totalStaked: 312000,
    lockPeriod: '14 days',
    minStake: 500,
    yourStake: 0,
    icon: GraduationCap,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'pool-premium',
    name: 'Premium Pool',
    description: 'High-yield staking pool with extended lock period for committed participants',
    apr: 10,
    totalStaked: 198000,
    lockPeriod: '90 days',
    minStake: 10000,
    yourStake: 0,
    icon: Sparkles,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
];

const REWARD_HISTORY = [
  { id: 'rw-001', date: '27 Jan 2026', type: 'learning' as const, description: 'Completed Advanced STEM Module', amount: 500, claimed: false },
  { id: 'rw-002', date: '25 Jan 2026', type: 'tutoring' as const, description: 'Tutoring session with Year 10 students', amount: 320, claimed: false },
  { id: 'rw-003', date: '24 Jan 2026', type: 'governance' as const, description: 'Voted on Proposal PROP-001', amount: 25, claimed: false },
  { id: 'rw-004', date: '22 Jan 2026', type: 'validation' as const, description: 'Validated 12 curriculum items', amount: 180, claimed: true },
  { id: 'rw-005', date: '20 Jan 2026', type: 'learning' as const, description: 'Completed Indigenous Language Module', amount: 750, claimed: true },
  { id: 'rw-006', date: '18 Jan 2026', type: 'tutoring' as const, description: 'Peer tutoring in Mathematics', amount: 160, claimed: true },
  { id: 'rw-007', date: '15 Jan 2026', type: 'governance' as const, description: 'Delegate participation bonus', amount: 50, claimed: true },
  { id: 'rw-008', date: '12 Jan 2026', type: 'validation' as const, description: 'Content quality review (8 items)', amount: 120, claimed: true },
];

const NFT_CREDENTIALS = [
  {
    id: 'nft-001',
    title: 'Advanced Calculus Course',
    category: 'Mathematics',
    image: null,
    mintStatus: 'minted' as const,
    validationStatus: 'verified' as const,
    mintDate: '15 Jan 2026',
    tokenId: '#4821',
    rarity: 'Rare',
  },
  {
    id: 'nft-002',
    title: 'Indigenous Art History',
    category: 'Cultural Studies',
    image: null,
    mintStatus: 'minted' as const,
    validationStatus: 'verified' as const,
    mintDate: '8 Jan 2026',
    tokenId: '#3156',
    rarity: 'Epic',
  },
  {
    id: 'nft-003',
    title: 'VR Chemistry Lab',
    category: 'Science',
    image: null,
    mintStatus: 'minted' as const,
    validationStatus: 'pending' as const,
    mintDate: '12 Jan 2026',
    tokenId: '#5234',
    rarity: 'Legendary',
  },
  {
    id: 'nft-004',
    title: 'Climate Science Mastery',
    category: 'Environmental Science',
    image: null,
    mintStatus: 'available' as const,
    validationStatus: 'verified' as const,
    mintDate: null,
    tokenId: null,
    rarity: 'Rare',
  },
  {
    id: 'nft-005',
    title: 'Digital Literacy Certificate',
    category: 'Technology',
    image: null,
    mintStatus: 'minted' as const,
    validationStatus: 'verified' as const,
    mintDate: '3 Jan 2026',
    tokenId: '#2897',
    rarity: 'Common',
  },
  {
    id: 'nft-006',
    title: 'First Nations Perspectives',
    category: 'Cultural Studies',
    image: null,
    mintStatus: 'available' as const,
    validationStatus: 'verified' as const,
    mintDate: null,
    tokenId: null,
    rarity: 'Epic',
  },
];

const RARITY_COLORS: Record<string, string> = {
  Common: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const REWARD_TYPE_CONFIG: Record<string, { icon: typeof BookOpen; color: string; bg: string; label: string }> = {
  learning: { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Learning' },
  tutoring: { icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Tutoring' },
  validation: { icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Validation' },
  governance: { icon: Vote, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Governance' },
};

export default function TokenEconomyPage() {
  const [activeTab, setActiveTab] = useState('balance');
  const [rewards, setRewards] = useState(REWARD_HISTORY);

  const claimableRewards = rewards.filter((r) => !r.claimed);
  const claimableAmount = claimableRewards.reduce((sum, r) => sum + r.amount, 0);

  const handleClaimAll = () => {
    setRewards((prev) => prev.map((r) => ({ ...r, claimed: true })));
  };

  const handleClaimSingle = (id: string) => {
    setRewards((prev) => prev.map((r) => (r.id === id ? { ...r, claimed: true } : r)));
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
            <h1 className="heading-2">Token Economy</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your EDU tokens, stake for rewards, and collect NFT credentials
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="nfts">NFTs</TabsTrigger>
        </TabsList>

        {/* Balance Tab */}
        <TabsContent value="balance" className="space-y-6">
          {/* Balance Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-4">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="text-4xl font-bold">{TOKEN_BALANCE.total.toLocaleString()}</p>
                    <p className="text-sm font-medium text-muted-foreground">EDU Tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <Coins className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TOKEN_BALANCE.available.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TOKEN_BALANCE.staked.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Staked</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Gift className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TOKEN_BALANCE.pendingRewards.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending Rewards</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent token movements and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Description</th>
                      <th className="px-4 py-3 text-right font-medium">Amount (EDU)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {TRANSACTION_HISTORY.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{tx.type}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium">{tx.description}</td>
                        <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${tx.direction === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {tx.direction === 'in' ? '+' : ''}{tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staking Tab */}
        <TabsContent value="staking" className="space-y-6">
          {/* Staking Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Lock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TOKEN_BALANCE.staked.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Staked</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">8.2%</p>
                  <p className="text-sm text-muted-foreground">Avg APR</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-sm text-muted-foreground">Active Pools</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Gift className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{TOKEN_BALANCE.pendingRewards.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending Rewards</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staking Pools */}
          <div className="grid gap-4 md:grid-cols-2">
            {STAKING_POOLS.map((pool) => {
              const Icon = pool.icon;
              const isStaked = pool.yourStake > 0;
              return (
                <Card key={pool.id} className={isStaked ? 'border-primary/30' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg ${pool.bg} p-3`}>
                          <Icon className={`h-6 w-6 ${pool.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{pool.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {pool.apr}% APR
                            </Badge>
                            {isStaked && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Staked
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{pool.description}</p>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Staked</p>
                        <p className="text-sm font-medium">{(pool.totalStaked / 1000).toFixed(0)}K EDU</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lock Period</p>
                        <p className="text-sm font-medium">{pool.lockPeriod}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Min Stake</p>
                        <p className="text-sm font-medium">{pool.minStake.toLocaleString()} EDU</p>
                      </div>
                    </div>

                    {isStaked && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Your Stake</span>
                          <span className="font-bold">{pool.yourStake.toLocaleString()} EDU</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-muted-foreground">Est. Weekly Reward</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            +{((pool.yourStake * pool.apr / 100) / 52).toFixed(0)} EDU
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button className="flex-1" variant={isStaked ? 'outline' : 'default'}>
                        <Lock className="h-4 w-4 mr-2" />
                        Stake
                      </Button>
                      {isStaked && (
                        <Button variant="outline" className="flex-1">
                          Unstake
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          {/* Claimable Rewards */}
          <Card className={claimableAmount > 0 ? 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-500/10 p-4">
                    <Gift className="h-8 w-8 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Claimable Rewards</p>
                    <p className="text-4xl font-bold">{claimableAmount.toLocaleString()}</p>
                    <p className="text-sm font-medium text-muted-foreground">EDU Tokens</p>
                  </div>
                </div>
                {claimableAmount > 0 && (
                  <Button onClick={handleClaimAll}>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim All ({claimableRewards.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reward Breakdown */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(REWARD_TYPE_CONFIG).map(([type, config]) => {
              const typeRewards = rewards.filter((r) => r.type === type);
              const typeTotal = typeRewards.reduce((sum, r) => sum + r.amount, 0);
              const Icon = config.icon;
              return (
                <Card key={type}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`rounded-lg ${config.bg} p-3`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{typeTotal.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{config.label} Rewards</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Reward History */}
          <Card>
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
              <CardDescription>All earned rewards across platform activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 divide-y">
                {rewards.map((reward) => {
                  const config = REWARD_TYPE_CONFIG[reward.type];
                  const Icon = config.icon;
                  return (
                    <div key={reward.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg ${config.bg} p-2`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{reward.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">{config.label}</Badge>
                            <span className="text-xs text-muted-foreground">{reward.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          +{reward.amount.toLocaleString()} EDU
                        </span>
                        {reward.claimed ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleClaimSingle(reward.id)}>
                            Claim
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NFTs Tab */}
        <TabsContent value="nfts" className="space-y-6">
          {/* NFT Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <Image className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{NFT_CREDENTIALS.filter((n) => n.mintStatus === 'minted').length}</p>
                  <p className="text-sm text-muted-foreground">Minted NFTs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{NFT_CREDENTIALS.filter((n) => n.validationStatus === 'verified').length}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{NFT_CREDENTIALS.filter((n) => n.mintStatus === 'available').length}</p>
                  <p className="text-sm text-muted-foreground">Available to Mint</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Award className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {NFT_CREDENTIALS.filter((n) => n.rarity === 'Epic' || n.rarity === 'Legendary').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Epic+ Rarity</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NFT Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {NFT_CREDENTIALS.map((nft) => (
              <Card key={nft.id} className="overflow-hidden">
                {/* NFT Image Placeholder */}
                <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <Image className="h-12 w-12 text-primary/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">{nft.category}</p>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold">{nft.title}</h3>
                      <Badge className={RARITY_COLORS[nft.rarity]} variant="secondary">
                        {nft.rarity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{nft.category}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {nft.mintStatus === 'minted' ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Minted
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                        Available
                      </Badge>
                    )}
                    {nft.validationStatus === 'verified' ? (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>

                  {nft.mintStatus === 'minted' ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Token {nft.tokenId}</span>
                      <span>Minted {nft.mintDate}</span>
                    </div>
                  ) : (
                    <Button size="sm" className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Mint NFT
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
