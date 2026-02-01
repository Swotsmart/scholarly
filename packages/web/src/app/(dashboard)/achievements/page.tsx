'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Medal, Award, Target, Flame, BookOpen, Zap } from 'lucide-react';

const ACHIEVEMENTS = [
  {
    id: 'math-master',
    name: 'Math Master',
    description: 'Complete 50 math challenges',
    icon: Target,
    progress: 35,
    total: 50,
    category: 'Learning',
    rarity: 'gold',
    unlocked: false,
  },
  {
    id: 'reading-champion',
    name: 'Reading Champion',
    description: 'Read 20 books',
    icon: BookOpen,
    progress: 20,
    total: 20,
    category: 'Learning',
    rarity: 'gold',
    unlocked: true,
    unlockedDate: '2026-01-15',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: Flame,
    progress: 7,
    total: 7,
    category: 'Dedication',
    rarity: 'silver',
    unlocked: true,
    unlockedDate: '2026-01-20',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    icon: Flame,
    progress: 14,
    total: 30,
    category: 'Dedication',
    rarity: 'platinum',
    unlocked: false,
  },
  {
    id: 'first-pitch',
    name: 'Pitch Perfect',
    description: 'Complete your first design pitch',
    icon: Zap,
    progress: 1,
    total: 1,
    category: 'Design',
    rarity: 'bronze',
    unlocked: true,
    unlockedDate: '2026-01-10',
  },
  {
    id: 'helper',
    name: 'Helping Hand',
    description: 'Help 10 classmates with their work',
    icon: Star,
    progress: 6,
    total: 10,
    category: 'Community',
    rarity: 'silver',
    unlocked: false,
  },
];

const STATS = [
  { label: 'Total XP', value: '2,450', icon: Star, color: 'text-yellow-500' },
  { label: 'Current Level', value: '8', icon: Trophy, color: 'text-purple-500' },
  { label: 'Achievements', value: '3/6', icon: Medal, color: 'text-blue-500' },
  { label: 'Day Streak', value: '14', icon: Flame, color: 'text-orange-500' },
];

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'bronze':
      return 'bg-amber-600';
    case 'silver':
      return 'bg-gray-400';
    case 'gold':
      return 'bg-yellow-500';
    case 'platinum':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
}

export default function AchievementsPage() {
  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.unlocked);
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground">Track your progress and unlock rewards</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-full bg-muted p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unlocked Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Unlocked Achievements
          </CardTitle>
          <CardDescription>Achievements you have earned</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {unlockedAchievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className="flex items-start gap-4 rounded-lg border p-4 bg-primary/5"
                >
                  <div className={`rounded-full p-3 ${getRarityColor(achievement.rarity)}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{achievement.name}</p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <p className="text-xs text-green-600 mt-1">
                      Unlocked {achievement.unlockedDate}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Locked Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-muted-foreground" />
            In Progress
          </CardTitle>
          <CardDescription>Keep going to unlock these achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lockedAchievements.map((achievement) => {
              const Icon = achievement.icon;
              const progressPercent = Math.round((achievement.progress / achievement.total) * 100);
              return (
                <div
                  key={achievement.id}
                  className="flex items-start gap-4 rounded-lg border p-4 opacity-75"
                >
                  <div className="rounded-full bg-muted p-3">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{achievement.name}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {achievement.rarity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>{achievement.progress}/{achievement.total}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
