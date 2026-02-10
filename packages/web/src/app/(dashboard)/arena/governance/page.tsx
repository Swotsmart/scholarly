'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Vote,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Coins,
  Sparkles,
  Megaphone,
  Scale,
  Users,
  BarChart3,
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { ArenaInsightPanel, VoteProgressBar } from '@/components/arena';
import { arenaApi } from '@/lib/arena-api';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import type {
  ArenaProposal,
  ArenaDelegation,
  DaoTreasury,
  DaoTreasuryTransaction,
  GovernanceStats,
  ProposalType,
} from '@/types/arena';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  QUORUM_REACHED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PASSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  EXECUTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const strategyLabels: Record<string, string> = {
  SIMPLE_MAJORITY: 'Simple Majority',
  SUPERMAJORITY: 'Supermajority',
  QUADRATIC: 'Quadratic',
  CONVICTION: 'Conviction',
};

const PROPOSAL_TYPE_OPTIONS: { value: ProposalType; label: string }[] = [
  { value: 'SIGNAL', label: 'Signal' },
  { value: 'FEATURE_PRIORITY', label: 'Feature Priority' },
  { value: 'CONTENT_POLICY', label: 'Content Policy' },
  { value: 'CURRICULUM_ADDITION', label: 'Curriculum Addition' },
  { value: 'TOKEN_ALLOCATION', label: 'Token Allocation' },
  { value: 'TREASURY_SPEND', label: 'Treasury Spend' },
  { value: 'PLATFORM_RULE', label: 'Platform Rule' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'EVENT_PLANNING', label: 'Event Planning' },
  { value: 'COMMUNITY_FUND', label: 'Community Fund' },
];

function formatTimeRemaining(endsAt?: string): string {
  if (!endsAt) return 'No deadline';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'Voting ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export default function GovernancePage() {
  const [proposals, setProposals] = useState<ArenaProposal[]>([]);
  const [delegations, setDelegations] = useState<ArenaDelegation[]>([]);
  const [treasury, setTreasury] = useState<DaoTreasury | null>(null);
  const [treasuryTxns, setTreasuryTxns] = useState<DaoTreasuryTransaction[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [votingProposal, setVotingProposal] = useState<string | null>(null);

  // Delegation form state
  const [delegateId, setDelegateId] = useState('');
  const [delegateTypes, setDelegateTypes] = useState<string[]>([]);
  const [delegateVoice, setDelegateVoice] = useState('');
  const [delegateDays, setDelegateDays] = useState('');
  const [creatingDelegation, setCreatingDelegation] = useState(false);

  const { insights, recommendations } = useArenaIntelligence({
    context: 'governance',
    proposals,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [proposalRes, delegationRes, treasuryRes, txnRes, statsRes] =
          await Promise.all([
            arenaApi.listProposals(),
            arenaApi.listDelegations(),
            arenaApi.getTreasury(),
            arenaApi.getTreasuryTransactions(),
            arenaApi.getGovernanceStats(),
          ]);
        if (proposalRes.success && proposalRes.data?.proposals) {
          setProposals(proposalRes.data.proposals);
        }
        if (delegationRes.success && delegationRes.data) {
          setDelegations(
            Array.isArray(delegationRes.data)
              ? delegationRes.data
              : []
          );
        }
        if (treasuryRes.success && treasuryRes.data) {
          setTreasury(treasuryRes.data);
        }
        if (txnRes.success && txnRes.data?.transactions) {
          setTreasuryTxns(txnRes.data.transactions);
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch {
        // Failed to load governance data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleVote = useCallback(
    async (proposalId: string, choice: 'FOR' | 'AGAINST' | 'ABSTAIN') => {
      setVotingProposal(proposalId);
      try {
        const res = await arenaApi.castVote(proposalId, {
          choice,
          voiceAmount: 1,
        });
        if (res.success && res.data?.proposal) {
          setProposals((prev) =>
            prev.map((p) =>
              p.id === proposalId ? { ...p, ...res.data.proposal } : p
            )
          );
        }
      } catch {
        // Vote failed
      } finally {
        setVotingProposal(null);
      }
    },
    []
  );

  const handleCreateDelegation = useCallback(async () => {
    if (!delegateId.trim() || !delegateVoice) return;
    setCreatingDelegation(true);
    try {
      const res = await arenaApi.createDelegation({
        delegateId: delegateId.trim(),
        proposalTypes: delegateTypes,
        voiceAmount: Number(delegateVoice),
        durationDays: Number(delegateDays) || 30,
      });
      if (res.success && res.data) {
        setDelegations((prev) => [...prev, res.data]);
        setDelegateId('');
        setDelegateTypes([]);
        setDelegateVoice('');
        setDelegateDays('');
      }
    } catch {
      // Delegation creation failed
    } finally {
      setCreatingDelegation(false);
    }
  }, [delegateId, delegateTypes, delegateVoice, delegateDays]);

  const handleRevokeDelegation = useCallback(async (id: string) => {
    try {
      const res = await arenaApi.revokeDelegation(id);
      if (res.success) {
        setDelegations((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // Revocation failed
    }
  }, []);

  const handleToggleDelegateType = useCallback((type: string) => {
    setDelegateTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

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
        title="Governance"
        description="Shape the platform's future"
        actions={
          <Vote className="h-7 w-7 text-primary" />
        }
      />

      <ArenaInsightPanel insights={insights} recommendations={recommendations} />

      <Tabs defaultValue="proposals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="delegations">Delegations</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* PROPOSALS TAB */}
        {/* ================================================================ */}
        <TabsContent value="proposals" className="space-y-4">
          {proposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No proposals yet. Be the first to create one!
              </p>
            </div>
          ) : (
            proposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{proposal.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {proposal.description}
                      </p>
                      {proposal.creator && (
                        <p className="text-xs text-muted-foreground">
                          by {proposal.creator.displayName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {proposal.type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge
                        className={cn(
                          'text-xs',
                          statusColors[proposal.status] || ''
                        )}
                      >
                        {proposal.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {strategyLabels[proposal.votingStrategy] ||
                          proposal.votingStrategy}
                      </Badge>
                    </div>
                  </div>

                  <VoteProgressBar
                    votesFor={proposal.votesFor}
                    votesAgainst={proposal.votesAgainst}
                    votesAbstain={proposal.votesAbstain}
                    showLabels
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeRemaining(proposal.votingEndsAt)}
                      {' '}
                      &middot; {proposal.totalVoters} voter
                      {proposal.totalVoters !== 1 ? 's' : ''}
                    </span>

                    {proposal.status === 'ACTIVE' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-950"
                          disabled={votingProposal === proposal.id}
                          onClick={() => handleVote(proposal.id, 'FOR')}
                        >
                          <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                          For
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                          disabled={votingProposal === proposal.id}
                          onClick={() => handleVote(proposal.id, 'AGAINST')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                          Against
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={votingProposal === proposal.id}
                          onClick={() => handleVote(proposal.id, 'ABSTAIN')}
                        >
                          <Minus className="h-3.5 w-3.5 mr-1" />
                          Abstain
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* DELEGATIONS TAB */}
        {/* ================================================================ */}
        <TabsContent value="delegations" className="space-y-6">
          {/* Current delegations */}
          {delegations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Active Delegations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {delegations.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">
                            {d.delegator?.displayName || 'You'}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {d.delegate?.displayName || d.delegateId}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {d.proposalTypes.map((t) => (
                            <Badge
                              key={t}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {t.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {d.voiceAmount} Voice
                          {d.expiresAt &&
                            ` -- Expires ${new Date(d.expiresAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevokeDelegation(d.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create delegation form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Delegation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Delegate User ID</label>
                  <Input
                    placeholder="Enter user ID"
                    value={delegateId}
                    onChange={(e) => setDelegateId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Voice Amount</label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Amount of Voice to delegate"
                    value={delegateVoice}
                    onChange={(e) => setDelegateVoice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (days)</label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="30"
                    value={delegateDays}
                    onChange={(e) => setDelegateDays(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Proposal Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {PROPOSAL_TYPE_OPTIONS.map((opt) => (
                    <Badge
                      key={opt.value}
                      variant={
                        delegateTypes.includes(opt.value)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer text-xs"
                      onClick={() => handleToggleDelegateType(opt.value)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreateDelegation}
                disabled={
                  creatingDelegation || !delegateId.trim() || !delegateVoice
                }
              >
                {creatingDelegation && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Create Delegation
              </Button>
            </CardContent>
          </Card>

          {delegations.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No active delegations. Use the form above to delegate your Voice.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* TREASURY TAB */}
        {/* ================================================================ */}
        <TabsContent value="treasury" className="space-y-6">
          {treasury ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatsCard
                  label="Sparks Balance"
                  value={treasury.sparksBalance.toLocaleString()}
                  icon={Sparkles}
                  variant="warning"
                />
                <StatsCard
                  label="Gems Balance"
                  value={treasury.gemsBalance.toLocaleString()}
                  icon={Coins}
                  variant="primary"
                />
                <StatsCard
                  label="Voice Balance"
                  value={treasury.voiceBalance.toLocaleString()}
                  icon={Megaphone}
                  variant="success"
                />
              </div>

              {/* Transaction history */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {treasuryTxns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No treasury transactions yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Direction
                            </th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Token
                            </th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Amount
                            </th>
                            <th className="pb-2 pr-4 font-medium text-muted-foreground">
                              Description
                            </th>
                            <th className="pb-2 font-medium text-muted-foreground">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {treasuryTxns.map((txn) => (
                            <tr key={txn.id}>
                              <td className="py-3 pr-4">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-xs font-medium',
                                    txn.direction === 'INFLOW'
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  )}
                                >
                                  {txn.direction === 'INFLOW' ? (
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                  ) : (
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  )}
                                  {txn.direction}
                                </span>
                              </td>
                              <td className="py-3 pr-4">{txn.tokenType}</td>
                              <td className="py-3 pr-4 tabular-nums font-medium">
                                {txn.amount.toLocaleString()}
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground max-w-xs truncate">
                                {txn.description || '--'}
                              </td>
                              <td className="py-3 text-muted-foreground">
                                {new Date(txn.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Coins className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Treasury data unavailable.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* STATS TAB */}
        {/* ================================================================ */}
        <TabsContent value="stats" className="space-y-6">
          {stats ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                  label="Total Proposals"
                  value={stats.totalProposals}
                  icon={Megaphone}
                  variant="primary"
                />
                <StatsCard
                  label="Active Proposals"
                  value={stats.activeProposals}
                  icon={Scale}
                  variant="warning"
                />
                <StatsCard
                  label="Passed Proposals"
                  value={stats.passedProposals}
                  icon={ThumbsUp}
                  variant="success"
                />
                <StatsCard
                  label="Total Votes Cast"
                  value={stats.totalVotesCast.toLocaleString()}
                  icon={Vote}
                  variant="primary"
                />
                <StatsCard
                  label="Unique Voters"
                  value={stats.uniqueVoters}
                  icon={Users}
                  variant="success"
                />
              </div>

              {stats.treasury && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Treasury Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Sparks</p>
                        <p className="text-lg font-bold">
                          {stats.treasury.sparks.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Gems</p>
                        <p className="text-lg font-bold">
                          {stats.treasury.gems.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Voice</p>
                        <p className="text-lg font-bold">
                          {stats.treasury.voice.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Total Allocated
                        </p>
                        <p className="text-lg font-bold">
                          {stats.treasury.totalAllocated.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Total Spent
                        </p>
                        <p className="text-lg font-bold">
                          {stats.treasury.totalSpent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Governance statistics unavailable.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
