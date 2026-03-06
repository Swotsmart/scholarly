'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Star,
  Medal,
  Award,
  Target,
  Flame,
  BookOpen,
  Zap,
  Loader2,
  TrendingUp,
  Calendar,
  Shield,
  Crown,
  Sparkles,
} from 'lucide-react';
import { arenaApi } from '@/lib/arena-api';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import type { TokenBalance, UserCompetitionStats } from '@/types/arena';

// =============================================================================
// TYPES
// =============================================================================

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
  total: number;
  category: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedDate?: string;
  xpReward: number;
}

// =============================================================================
// FALLBACK DATA
// =============================================================================

const FALLBACK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'math-master', name: 'Math Master', description: 'Complete 50 math challenges',
    icon: Target, progress: 35, total: 50, category: 'Learning', rarity: 'gold',
    unlocked: false, xpReward: 500,
  },
  {
    id: 'reading-champion', name: 'Reading Champion', description: 'Read 20 books',
    icon: BookOpen, progress: 20, total: 20, category: 'Learning', rarity: 'gold',
    unlocked: true, unlockedDate: '2026-01-15', xpReward: 500,
  },
  {
    id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day learning streak',
    icon: Flame, progress: 7, total: 7, category: 'Dedication', rarity: 'silver',
    unlocked: true, unlockedDate: '2026-01-20', xpReward: 200,
  },
  {
    id: 'streak-30', name: 'Monthly Master', description: 'Maintain a 30-day learning streak',
    icon: Flame, progress: 14, total: 30, category: 'Dedication', rarity: 'platinum',
    unlocked: false, xpReward: 1000,
  },
  {
    id: 'first-pitch', name: 'Pitch Perfect', description: 'Complete your first design pitch',
    icon: Zap, progress: 1, total: 1, category: 'Design', rarity: 'bronze',
    unlocked: true, unlockedDate: '2026-01-10', xpReward: 100,
  },
  {
    id: 'helper', name: 'Helping Hand', description: 'Help 10 classmates with their work',
    icon: Star, progress: 6, total: 10, category: 'Community', rarity: 'silver',
    unlocked: false, xpReward: 300,
  },
  {
    id: 'first-win', name: 'First Victory', description: 'Win your first arena competition',
    icon: Trophy, progress: 1, total: 1, category: 'Arena', rarity: 'bronze',
    unlocked: true, unlockedDate: '2026-02-01', xpReward: 150,
  },
  {
    id: 'team-player', name: 'Team Player', description: 'Participate in 5 team competitions',
    icon: Shield, progress: 3, total: 5, category: 'Arena', rarity: 'silver',
    unlocked: false, xpReward: 250,
  },
  {
    id: 'token-saver', name: 'Token Collector', description: 'Earn 1000 total Sparks tokens',
    icon: Sparkles, progress: 750, total: 1000, category: 'Economy', rarity: 'gold',
    unlocked: false, xpReward: 400,
  },
  {
    id: 'perfect-score', name: 'Perfect Score', description: 'Score 100% on any assessment',
    icon: Crown, progress: 1, total: 1, category: 'Learning', rarity: 'gold',
    unlocked: true, unlockedDate: '2026-02-10', xpReward: 350,
  },
];

// =============================================================================
// RARITY HELPERS
// =============================================================================

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'bronze': return 'bg-amber-600';
    case 'silver': return 'bg-gray-400';
    case 'gold': return 'bg-yellow-500';
    case 'platinum': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
}

function getRarityBorder(rarity: string): string {
  switch (rarity) {
    case 'bronze': return 'border-amber-600/30';
    case 'silver': return 'border-gray-400/30';
    case 'gold': return 'border-yellow-500/30';
    case 'platinum': return 'border-purple-500/30';
    default: return '';
  }
}

function getRarityGlow(rarity: string): string {
  switch (rarity) {
    case 'gold': return 'shadow-yellow-500/20 shadow-md';
    case 'platinum': return 'shadow-purple-500/20 shadow-md';
    default: return '';
  }
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-full bg-muted p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ACHIEVEMENT CARD
// =============================================================================

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const Icon = achievement.icon;
  const progressPercent = Math.round((achievement.progress / achievement.total) * 100);

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 transition-all ${
        achievement.unlocked
          ? `bg-primary/5 ${getRarityBorder(achievement.rarity)} ${getRarityGlow(achievement.rarity)}`
          : 'opacity-75 hover:opacity-90'
      }`}
    >
      <div className={`rounded-full p-3 ${achievement.unlocked ? getRarityColor(achievement.rarity) : 'bg-muted'}`}>
        <Icon className={`h-6 w-6 ${achievement.unlocked ? 'text-white' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{achievement.name}</p>
          <Badge
            variant={achievement.unlocked ? 'secondary' : 'outline'}
            className="text-xs capitalize"
          >
            {achievement.rarity}
          </Badge>
          <Badge variant="outline" className="text-xs">
            +{achievement.xpReward} XP
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{achievement.description}</p>

        {achievement.unlocked ? (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            Unlocked {achievement.unlockedDate
              ? new Date(achievement.unlockedDate).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              : ''}
          </p>
        ) : (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>{achievement.progress.toLocaleString()}/{achievement.total.toLocaleString()}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STREAK DISPLAY
// =============================================================================

function StreakDisplay({ currentStreak, bestStreak }: { currentStreak: number; bestStreak: number }) {
  // Show last 7 days
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  // Map: 0=Sun → index 6, 1=Mon → index 0, etc.
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-orange-500" />
          Learning Streak
        </CardTitle>
        <CardDescription>
          {currentStreak > 0 ? `${currentStreak}-day streak! Keep it going!` : 'Start learning today to begin a streak!'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          {days.map((d, i) => {
            const isActive = i <= todayIdx && i > todayIdx - currentStreak;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : i <= todayIdx
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted/50 text-muted-foreground/50'
                  }`}
                >
                  {isActive ? <Flame className="h-4 w-4" /> : d}
                </div>
                <span className="text-[10px] text-muted-foreground">{d}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current: <span className="font-semibold text-foreground">{currentStreak} days</span></span>
          <span className="text-muted-foreground">Best: <span className="font-semibold text-foreground">{bestStreak} days</span></span>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(FALLBACK_ACHIEVEMENTS);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [userStats, setUserStats] = useState<UserCompetitionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load arena data for XP, tokens, badges
  useEffect(() => {
    async function loadArenaData() {
      try {
        const [balanceRes, statsRes] = await Promise.allSettled([
          arenaApi.getTokenBalance(),
          arenaApi.getUserStats(),
        ]);

        if (balanceRes.status === 'fulfilled' && balanceRes.value.success) {
          setTokenBalance(balanceRes.value.data);
          // Update token-related achievements with real data
          const bal = balanceRes.value.data as TokenBalance;
          setAchievements((prev) =>
            prev.map((a) => {
              if (a.id === 'token-saver') {
                const earned = bal.lifetimeSparksEarned ?? 0;
                return {
                  ...a,
                  progress: Math.min(earned, a.total),
                  unlocked: earned >= a.total,
                  unlockedDate: earned >= a.total ? new Date().toISOString().split('T')[0] : undefined,
                };
              }
              return a;
            }),
          );
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
          const stats = statsRes.value.data as UserCompetitionStats;
          setUserStats(stats);
          // Update competition-related achievements
          setAchievements((prev) =>
            prev.map((a) => {
              if (a.id === 'first-win') {
                return {
                  ...a,
                  progress: Math.min(stats.wins ?? 0, 1),
                  unlocked: (stats.wins ?? 0) >= 1,
                };
              }
              if (a.id === 'team-player') {
                const teamComps = stats.totalCompetitions ?? 0;
                return {
                  ...a,
                  progress: Math.min(teamComps, a.total),
                  unlocked: teamComps >= a.total,
                };
              }
              return a;
            }),
          );
        }
      } catch {
        // Keep fallback data
      } finally {
        setIsLoading(false);
      }
    }
    loadArenaData();
  }, []);

  // Intelligence for recommendations
  const intelligence = useArenaIntelligence({
    context: 'hub',
    tokenBalance,
    userStats,
  });

  // Derived values
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);
  const categories = useMemo(() => {
    const cats = new Set(achievements.map((a) => a.category));
    return ['all', ...Array.from(cats)];
  }, [achievements]);

  const filteredAchievements = useMemo(
    () => (activeCategory === 'all' ? achievements : achievements.filter((a) => a.category === activeCategory)),
    [achievements, activeCategory],
  );

  const totalXP = useMemo(() => {
    const earnedXP = unlockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);
    const tokenXP = tokenBalance ? (tokenBalance.lifetimeSparksEarned ?? 0) : 0;
    return earnedXP + tokenXP;
  }, [unlockedAchievements, tokenBalance]);

  const currentLevel = Math.floor(totalXP / 500) + 1;
  const xpInLevel = totalXP % 500;
  const xpToNextLevel = 500;
  const levelProgress = Math.round((xpInLevel / xpToNextLevel) * 100);

  const currentStreak = useMemo(() => {
    // Use streak data from achievements
    const streakAch = achievements.find((a) => a.id === 'streak-30');
    return streakAch?.progress ?? 14;
  }, [achievements]);

  const bestStreak = useMemo(() => {
    const s7 = achievements.find((a) => a.id === 'streak-7');
    const s30 = achievements.find((a) => a.id === 'streak-30');
    return Math.max(s7?.progress ?? 0, s30?.progress ?? 0, currentStreak);
  }, [achievements, currentStreak]);

  const winRate = userStats && userStats.totalCompetitions > 0
    ? Math.round((userStats.wins / userStats.totalCompetitions) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground">Track your progress and unlock rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total XP" value={totalXP.toLocaleString()} icon={Star} color="text-yellow-500" subtitle={`Level ${currentLevel}`} />
        <StatCard label="Current Level" value={String(currentLevel)} icon={Trophy} color="text-purple-500" subtitle={`${xpInLevel}/${xpToNextLevel} XP to next`} />
        <StatCard
          label="Achievements"
          value={`${unlockedAchievements.length}/${achievements.length}`}
          icon={Medal}
          color="text-blue-500"
          subtitle={`${lockedAchievements.length} remaining`}
        />
        <StatCard label="Day Streak" value={String(currentStreak)} icon={Flame} color="text-orange-500" subtitle={`Best: ${bestStreak} days`} />
      </div>

      {/* Level Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">Level {currentLevel}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {xpInLevel} / {xpToNextLevel} XP to Level {currentLevel + 1}
            </span>
          </div>
          <Progress value={levelProgress} className="h-3" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Total: {totalXP.toLocaleString()} XP earned</span>
            {tokenBalance && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {tokenBalance.sparks} Sparks &middot; {tokenBalance.gems} Gems &middot; {tokenBalance.voice} Voice
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Streak + Competition Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <StreakDisplay currentStreak={currentStreak} bestStreak={bestStreak} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Competition Stats
            </CardTitle>
            <CardDescription>Your arena performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{userStats?.totalCompetitions ?? 0}</p>
                <p className="text-xs text-muted-foreground">Competitions</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{userStats?.wins ?? 0}</p>
                <p className="text-xs text-muted-foreground">Wins</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{userStats?.avgScore?.toFixed(0) ?? 0}</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
            {intelligence.nextBestAction && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={intelligence.nextBestAction.href}>
                  {intelligence.nextBestAction.label}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements — Tabbed by Category */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <div className="flex items-center justify-between">
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeCategory} className="mt-4 space-y-6">
          {/* Unlocked */}
          {filteredAchievements.some((a) => a.unlocked) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Unlocked Achievements
                </CardTitle>
                <CardDescription>Achievements you have earned</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredAchievements
                    .filter((a) => a.unlocked)
                    .map((achievement) => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* In Progress */}
          {filteredAchievements.some((a) => !a.unlocked) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-muted-foreground" />
                  In Progress
                </CardTitle>
                <CardDescription>Keep going to unlock these achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredAchievements
                    .filter((a) => !a.unlocked)
                    .sort((a, b) => {
                      // Sort by progress percentage (closest to completion first)
                      const aPct = a.progress / a.total;
                      const bPct = b.progress / b.total;
                      return bPct - aPct;
                    })
                    .map((achievement) => (
                      <AchievementCard key={achievement.id} achievement={achievement} />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {filteredAchievements.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Medal className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">No achievements in this category yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
