'use client';

/**
 * LinguaFlow Main Page
 * Language learning dashboard with progress and recommendations
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Mic,
  Headphones,
  PenTool,
  Flame,
  Target,
  Clock,
  Trophy,
  ChevronRight,
  Star,
  Zap,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { linguaflowApi } from '@/lib/linguaflow-api';
import {
  type LearningProgress,
  type SkillType,
  CEFR_LEVELS,
  SUPPORTED_LANGUAGES,
  SKILL_ICONS,
} from '@/types/linguaflow';

const skillColors: Record<SkillType, string> = {
  reading: 'from-blue-500 to-cyan-500',
  writing: 'from-purple-500 to-pink-500',
  listening: 'from-green-500 to-emerald-500',
  speaking: 'from-orange-500 to-red-500',
};

const skillIcons: Record<SkillType, React.ReactNode> = {
  reading: <BookOpen className="w-5 h-5" />,
  writing: <PenTool className="w-5 h-5" />,
  listening: <Headphones className="w-5 h-5" />,
  speaking: <Mic className="w-5 h-5" />,
};

export default function LinguaFlowPage() {
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
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Unable to load progress</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { profile, skills, weeklyStats, recommendations, recentSessions } = progress;
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === profile.targetLanguage);
  const levelInfo = CEFR_LEVELS[profile.currentLevel];

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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {language?.flag} {language?.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {levelInfo.name} ({profile.currentLevel}) · {profile.vocabularyMastered} words mastered
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-700 dark:text-orange-400">
              {profile.dailyStreakDays} day streak
            </span>
          </div>
          <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full">
            <Zap className="w-5 h-5 text-purple-500" />
            <span className="font-bold text-purple-700 dark:text-purple-400">
              {profile.totalXP} XP
            </span>
          </div>
        </div>
      </motion.div>

      {/* Weekly Goal Progress */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Weekly Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <Progress value={weeklyStats.goalProgress} className="flex-1 h-3" />
              <span className="text-lg font-bold text-primary">
                {weeklyStats.goalProgress}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{weeklyStats.minutesPracticed}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.sessionsCompleted}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.vocabularyLearned}</div>
                <div className="text-xs text-muted-foreground">Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.xpEarned}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Skills Grid */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Your Skills</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {skills.map((skill) => (
            <motion.div
              key={skill.skill}
              whileHover={{ scale: 1.02 }}
              className={cn(
                'relative overflow-hidden rounded-xl p-4 text-white',
                'bg-gradient-to-br',
                skillColors[skill.skill]
              )}
            >
              <div className="flex items-center justify-between mb-2">
                {skillIcons[skill.skill]}
                <span className="text-sm font-medium opacity-90">
                  {SKILL_ICONS[skill.skill]}
                </span>
              </div>
              <h3 className="text-lg font-bold capitalize mb-1">{skill.skill}</h3>
              <div className="text-sm opacity-90 mb-2">Level: {skill.level}</div>
              <Progress
                value={skill.progressPercent}
                className="h-2 bg-white/30"
              />
              <div className="text-xs mt-1 opacity-80">
                {skill.progressPercent}% to next level
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/linguaflow/vocabulary">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Vocabulary Review</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  12 cards due for review
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Start Review <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/linguaflow/grammar">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                  <PenTool className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Grammar Lessons</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Continue: Subjunctive Mood
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/linguaflow/conversation">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-lg mb-1">AI Conversation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Practice speaking with AI tutor
                </p>
                <div className="flex items-center text-primary text-sm font-medium">
                  Start Chat <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <Link key={index} href={rec.actionUrl}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      rec.priority === 'high'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : rec.priority === 'medium'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {rec.type === 'vocabulary' && <BookOpen className="w-5 h-5" />}
                    {rec.type === 'grammar' && <PenTool className="w-5 h-5" />}
                    {rec.type === 'conversation' && <Mic className="w-5 h-5" />}
                    {rec.type === 'review' && <Clock className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {rec.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-muted-foreground">
                      {rec.estimatedMinutes} min
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentSessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center gap-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      'bg-gradient-to-br text-white',
                      skillColors[session.skill]
                    )}
                  >
                    {skillIcons[session.skill]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {session.type} Practice
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.durationMinutes} min · {session.activitiesCompleted} activities ·{' '}
                      {Math.round(session.accuracy * 100)}% accuracy
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary font-medium">
                      <Star className="w-4 h-4" />
                      +{session.xpEarned} XP
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString()}
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
