'use client';

import { useState, useEffect } from 'react';
import {
  Coins,
  Loader2,
  Zap,
  Gem,
  MessageCircle,
  TrendingUp,
  PiggyBank,
  Lock,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Activity,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { ArenaInsightPanel, TokenBalanceCard } from '@/components/arena';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { arenaApi } from '@/lib/arena-api';
import { cn } from '@/lib/utils';
import type {
  TokenBalance,
  ArenaTokenTransaction,
  ArenaStakePosition,
  TokenEconomyMetrics,
  StakePoolType,
  TokenType,
} from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const POOL_TYPE_OPTIONS: { value: StakePoolType; label: string }[] = [
  { value: 'ARENA_TOURNAMENT', label: 'Arena Tournament' },
  { value: 'TEAM_TREASURY', label: 'Team Treasury' },
  { value: 'CONTENT_BOUNTY', label: 'Content Bounty' },
  { value: 'GOVERNANCE_LOCK', label: 'Governance Lock' },
  { value: 'CREATOR_BOND', label: 'Creator Bond' },
  { value: 'SAVINGS_POOL', label: 'Savings Pool' },
];

const TOKEN_TYPE_OPTIONS: { value: TokenType; label: string }[] = [
  { value: 'SPARKS', label: 'Sparks' },
  { value: 'GEMS', label: 'Gems' },
  { value: 'VOICE', label: 'Voice' },
];

const txnTypeBadges: Record<
  string,
  { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; color: string }
> = {
  EARN: { label: 'Earn', variant: 'default', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  SPEND: { label: 'Spend', variant: 'destructive', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  STAKE: { label: 'Stake', variant: 'secondary', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  UNSTAKE: { label: 'Unstake', variant: 'outline', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
};

const poolLabels: Record<string, string> = {
  ARENA_TOURNAMENT: 'Arena Tournament',
  TEAM_TREASURY: 'Team Treasury',
  CONTENT_BOUNTY: 'Content Bounty',
  GOVERNANCE_LOCK: 'Governance Lock',
  CREATOR_BOND: 'Creator Bond',
  SAVINGS_POOL: 'Savings Pool',
};

const tokenIcons: Record<string, typeof Zap> = {
  SPARKS: Zap,
  GEMS: Gem,
  VOICE: MessageCircle,
};

// =============================================================================
// DEMO STAKE POSITIONS (replicated from API since no dedicated endpoint)
// =============================================================================

const DEMO_STAKE_POSITIONS: ArenaStakePosition[] = [
  {
    id: 'stake_pos_001',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'ARENA_TOURNAMENT',
    poolId: 'tourn_abc123def',
    tokenType: 'SPARKS',
    amount: 100,
    yieldAccrued: 8,
    lockedUntil: '2026-03-10T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-02-08T10:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'stake_pos_002',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'SAVINGS_POOL',
    tokenType: 'SPARKS',
    amount: 100,
    yieldAccrued: 22,
    lockedUntil: '2026-06-01T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'stake_pos_003',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'GOVERNANCE_LOCK',
    tokenType: 'VOICE',
    amount: 15,
    yieldAccrued: 3,
    lockedUntil: '2026-04-01T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
];

// =============================================================================
// SKELETONS
// =============================================================================

function BalanceSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-1.5 bg-muted animate-pulse" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-7 w-20 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-5 w-14 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function TokensPage() {
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<ArenaTokenTransaction[]>([]);
  const [stakePositions] = useState<ArenaStakePosition[]>(DEMO_STAKE_POSITIONS);
  const [economyMetrics, setEconomyMetrics] = useState<TokenEconomyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Stake form
  const [stakePool, setStakePool] = useState<StakePoolType>('SAVINGS_POOL');
  const [stakeToken, setStakeToken] = useState<TokenType>('SPARKS');
  const [stakeAmount, setStakeAmount] = useState<number>(50);
  const [stakeLockDays, setStakeLockDays] = useState<number>(30);

  const { insights, recommendations } = useArenaIntelligence({
    context: 'tokens',
    tokenBalance,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [balRes, txRes, ecoRes] = await Promise.all([
          arenaApi.getTokenBalance(),
          arenaApi.getTokenHistory(),
          arenaApi.getEconomyMetrics(),
        ]);
        if (balRes.success && balRes.data) setTokenBalance(balRes.data);
        if (txRes.success && txRes.data?.transactions)
          setTransactions(txRes.data.transactions);
        if (ecoRes.success && ecoRes.data) setEconomyMetrics(ecoRes.data);
      } catch {
        // Failed to load token data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleStake() {
    if (stakeAmount <= 0) return;
    setStaking(true);
    try {
      const res = await arenaApi.stakeTokens({
        poolType: stakePool,
        tokenType: stakeToken,
        amount: stakeAmount,
        lockDays: stakeLockDays,
      });
      if (res.success) {
        // Refresh balance after staking
        const balRes = await arenaApi.getTokenBalance();
        if (balRes.success && balRes.data) setTokenBalance(balRes.data);
      }
    } catch {
      // Failed to stake
    } finally {
      setStaking(false);
    }
  }

  const totalAvailable = tokenBalance
    ? tokenBalance.sparks + tokenBalance.gems + tokenBalance.voice
    : 0;
  const totalStaked = tokenBalance
    ? tokenBalance.stakedSparks + tokenBalance.stakedGems + tokenBalance.stakedVoice
    : 0;
  const totalLifetime = tokenBalance
    ? tokenBalance.lifetimeSparksEarned +
      tokenBalance.lifetimeGemsEarned +
      tokenBalance.lifetimeVoiceEarned
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tokens"
        description="Earn, stake, and manage your tokens"
        actions={<Coins className="h-7 w-7 text-amber-600 dark:text-amber-400" />}
      />

      <ArenaInsightPanel insights={insights} recommendations={recommendations} />

      {/* Token Balance Cards */}
      {loading ? (
        <BalanceSkeleton />
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Coins className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Unable to load token balance. Please try again later.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staking">Staking</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="economy">Economy</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatsCard
              label="Total Available"
              value={totalAvailable.toLocaleString()}
              icon={Coins}
              variant="primary"
            />
            <StatsCard
              label="Total Staked"
              value={totalStaked.toLocaleString()}
              icon={Lock}
              variant="warning"
            />
            <StatsCard
              label="Lifetime Earned"
              value={totalLifetime.toLocaleString()}
              icon={TrendingUp}
              variant="success"
            />
          </div>

          {/* AI Token Advisor */}
          {recommendations.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Token Advisor</p>
                  {recommendations
                    .filter((r) => r.type === 'token')
                    .slice(0, 1)
                    .map((rec, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground mt-0.5">
                        {rec.reason}
                      </p>
                    ))}
                  {recommendations.filter((r) => r.type === 'token').length === 0 && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your token portfolio is well managed. Keep earning through
                      competitions and content contributions.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Staking Tab */}
        <TabsContent value="staking" className="space-y-4 mt-4">
          {/* Active Positions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Positions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4">
                  <TableSkeleton rows={3} />
                </div>
              ) : stakePositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <PiggyBank className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No active stake positions. Stake tokens to start earning yield.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-4 py-3">Pool</th>
                        <th className="px-4 py-3">Token</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-right">Yield</th>
                        <th className="px-4 py-3 text-right">Locked Until</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stakePositions.map((pos) => {
                        const TokenIcon = tokenIcons[pos.tokenType] || Coins;
                        const isLocked = new Date(pos.lockedUntil) > new Date();
                        return (
                          <tr
                            key={pos.id}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium">
                                {poolLabels[pos.poolType] || pos.poolType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <TokenIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                {pos.tokenType}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {pos.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-green-600 dark:text-green-400">
                              +{pos.yieldAccrued.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                              <div className="flex items-center justify-end gap-1">
                                {isLocked && <Lock className="h-3 w-3" />}
                                {new Date(pos.lockedUntil).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Badge
                                variant={pos.status === 'ACTIVE' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {pos.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stake Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stake Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Pool Type
                  </label>
                  <Select
                    value={stakePool}
                    onValueChange={(v) => setStakePool(v as StakePoolType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POOL_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Token Type
                  </label>
                  <Select
                    value={stakeToken}
                    onValueChange={(v) => setStakeToken(v as TokenType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOKEN_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
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
                    value={stakeAmount}
                    onChange={(e) =>
                      setStakeAmount(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Lock Days
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={stakeLockDays}
                    onChange={(e) =>
                      setStakeLockDays(parseInt(e.target.value) || 30)
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={handleStake}
                  disabled={staking || stakeAmount <= 0}
                >
                  {staking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PiggyBank className="mr-2 h-4 w-4" />
                  )}
                  Stake Tokens
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4">
                  <TableSkeleton />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No transaction history yet. Start earning tokens!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Token</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => {
                        const badge = txnTypeBadges[txn.transactionType] || {
                          label: txn.transactionType,
                          color: '',
                        };
                        const isPositive = txn.amount > 0;
                        const TokenIcon = tokenIcons[txn.tokenType] || Coins;

                        return (
                          <tr
                            key={txn.id}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(txn.createdAt).toLocaleDateString()}{' '}
                              {new Date(txn.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                  badge.color
                                )}
                              >
                                {txn.transactionType === 'EARN' || txn.transactionType === 'UNSTAKE' ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <TokenIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs">{txn.tokenType}</span>
                              </div>
                            </td>
                            <td
                              className={cn(
                                'px-4 py-3 text-right font-semibold tabular-nums',
                                isPositive
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              )}
                            >
                              {isPositive ? '+' : ''}
                              {txn.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {txn.category
                                ?.replace(/_/g, ' ')
                                .toLowerCase()
                                .replace(/\b\w/g, (c) => c.toUpperCase()) || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Economy Tab */}
        <TabsContent value="economy" className="space-y-4 mt-4">
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
          ) : !economyMetrics ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Economy metrics are not available right now.
              </p>
            </div>
          ) : (
            <>
              {/* Circulating Supply */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Circulating Supply</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatsCard
                    label="Circulating Sparks"
                    value={economyMetrics.circulating.sparks.toLocaleString()}
                    icon={Zap}
                    variant="warning"
                  />
                  <StatsCard
                    label="Circulating Gems"
                    value={economyMetrics.circulating.gems.toLocaleString()}
                    icon={Gem}
                    variant="primary"
                  />
                  <StatsCard
                    label="Circulating Voice"
                    value={economyMetrics.circulating.voice.toLocaleString()}
                    icon={MessageCircle}
                    variant="success"
                  />
                </div>
              </div>

              {/* Staked Amounts */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Staked Tokens</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatsCard
                    label="Staked Sparks"
                    value={economyMetrics.staked.sparks.toLocaleString()}
                    icon={Lock}
                    variant="warning"
                  />
                  <StatsCard
                    label="Staked Gems"
                    value={economyMetrics.staked.gems.toLocaleString()}
                    icon={Lock}
                    variant="primary"
                  />
                  <StatsCard
                    label="Staked Voice"
                    value={economyMetrics.staked.voice.toLocaleString()}
                    icon={Lock}
                    variant="success"
                  />
                </div>
              </div>

              {/* Platform Activity */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Platform Activity</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatsCard
                    label="24h Transactions"
                    value={economyMetrics.transactionsLast24h.toLocaleString()}
                    icon={Activity}
                    variant="primary"
                  />
                  <StatsCard
                    label="Active Users"
                    value={economyMetrics.activeUsers.toLocaleString()}
                    icon={Users}
                    variant="success"
                  />
                  <StatsCard
                    label="Total Positions"
                    value={economyMetrics.staked.totalPositions.toLocaleString()}
                    icon={PiggyBank}
                    variant="warning"
                  />
                  <StatsCard
                    label="Total Yield Accrued"
                    value={economyMetrics.staked.totalYieldAccrued.toLocaleString()}
                    icon={TrendingUp}
                    variant="success"
                  />
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
