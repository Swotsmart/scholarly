'use client';

/**
 * LinguaFlow Progress Page
 * Detailed progress tracking and analytics
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  Trophy,
  Target,
  Calendar,
  BookOpen,
  PenTool,
  Headphones,
  Mic,
  Clock,
  Flame,
  Star,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { linguaflowApi } from '@/lib/linguaflow-api';
import { type LearningProgress, type SkillType, CEFR_LEVELS } from '@/types/linguaflow';

const skillIcons: Record<SkillType, React.ReactNode> = {
  reading: <BookOpen className="w-5 h-5" />,
  writing: <PenTool className="w-5 h-5" />,
  listening: <Headphones className="w-5 h-5" />,
  speaking: <Mic className="w-5 h-5" />,
};

const skillColors: Record<SkillType, string> = {
  reading: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  writing: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  listening: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  speaking: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const data = await linguaflowApi.getProgress();
        setProgress(data);
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading progress...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load progress</p>
      </div>
    );
  }

  const { profile, skills, weeklyStats, recentSessions } = progress;

  // Calculate level progress
  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const currentLevelIndex = levelOrder.indexOf(profile.currentLevel);
  const targetLevelIndex = levelOrder.indexOf(profile.targetLevel);
  const levelProgress = ((currentLevelIndex + 1) / (targetLevelIndex + 1)) * 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Link
          href="/linguaflow"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Learning Progress</h1>
          <p className="text-muted-foreground">
            Track your journey to {profile.targetLevel}
          </p>
        </div>
      </motion.div>

      {/* Overall Level Progress */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {profile.currentLevel}
                </div>
                <div className="text-sm text-muted-foreground">Current</div>
              </div>
              <div className="flex-1 px-6">
                <Progress value={levelProgress} className="h-4" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  {levelOrder.map((level) => (
                    <span
                      key={level}
                      className={cn(
                        levelOrder.indexOf(level) <= currentLevelIndex && 'text-primary font-medium'
                      )}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-muted-foreground">
                  {profile.targetLevel}
                </div>
                <div className="text-sm text-muted-foreground">Target</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="text-xl font-bold">{profile.dailyStreakDays}</span>
                </div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-xl font-bold">{profile.totalXP.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-xl font-bold">{profile.vocabularyMastered}</span>
                </div>
                <div className="text-xs text-muted-foreground">Words Mastered</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xl font-bold">{profile.longestStreak}</span>
                </div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skills Breakdown */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Skills Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {skills.map((skill) => (
                <div key={skill.skill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          skillColors[skill.skill]
                        )}
                      >
                        {skillIcons[skill.skill]}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{skill.skill}</div>
                        <div className="text-sm text-muted-foreground">
                          Level {skill.level} · {skill.practiceCount} practices
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{skill.progressPercent}%</div>
                      <div className="text-xs text-muted-foreground">
                        to {levelOrder[levelOrder.indexOf(skill.level) + 1] || 'C2'}
                      </div>
                    </div>
                  </div>
                  <Progress value={skill.progressPercent} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Stats */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{weeklyStats.minutesPracticed}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{weeklyStats.sessionsCompleted}</div>
                <div className="text-sm text-muted-foreground">Sessions</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{weeklyStats.vocabularyLearned}</div>
                <div className="text-sm text-muted-foreground">New Words</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Star className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <div className="text-2xl font-bold">{weeklyStats.xpEarned}</div>
                <div className="text-sm text-muted-foreground">XP Earned</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Weekly Goal Progress</span>
                <span className="text-sm text-muted-foreground">
                  {weeklyStats.minutesPracticed}/{profile.weeklyGoalMinutes} min
                </span>
              </div>
              <Progress value={weeklyStats.goalProgress} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      skillColors[session.skill]
                    )}
                  >
                    {skillIcons[session.skill]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {session.type} · {session.skill}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString()} ·{' '}
                      {session.durationMinutes} min · {Math.round(session.accuracy * 100)}% accuracy
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-primary">+{session.xpEarned} XP</div>
                    <div className="text-xs text-muted-foreground">
                      {session.activitiesCompleted} activities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
