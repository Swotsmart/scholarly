'use client';

/**
 * Parent Dashboard Page
 * Shows progress for all children in the family with recommendations
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Lightbulb,
  Trophy,
  Calendar,
  ChevronRight,
  Settings,
  Plus,
  BookOpen,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { earlyYearsApi } from '@/lib/early-years-api';
import { getAvatar } from '@/components/early-years/child-selector';
import type { ParentDashboard } from '@/types/early-years';

export default function ParentDashboardPage() {
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await earlyYearsApi.getParentDashboard();
        setDashboard(data);
      } catch (error) {
        console.error('Failed to load parent dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load dashboard</p>
          <Link href="/early-years" className="text-purple-600 hover:underline mt-2 block">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  const { family, childrenSummary, weeklyReport, recommendations, upcomingMilestones } = dashboard;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/early-years"
                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Parent Dashboard</h1>
                <p className="text-sm text-gray-500">{family.familyName}</p>
              </div>
            </div>
            <Link
              href="/early-years/settings"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </Link>
          </div>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-4 py-6 space-y-6"
      >
        {/* Weekly Overview */}
        <motion.section variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            This Week's Summary
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Total Time"
              value={`${weeklyReport.totalMinutes} min`}
              change={weeklyReport.comparedToLastWeek.minutesChange}
              color="blue"
            />
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Sessions"
              value={weeklyReport.totalSessions.toString()}
              change={weeklyReport.comparedToLastWeek.sessionsChange}
              color="green"
            />
            <StatCard
              icon={<Star className="w-5 h-5" />}
              label="Stars Earned"
              value={weeklyReport.totalStarsEarned.toString()}
              color="yellow"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Progress"
              value={`+${weeklyReport.comparedToLastWeek.progressChange}%`}
              color="purple"
            />
          </div>

          {/* Progress Bars */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-emerald-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Phonics Progress
                </span>
                <span className="font-bold text-emerald-600">
                  {weeklyReport.phonicsProgress}%
                </span>
              </div>
              <Progress value={weeklyReport.phonicsProgress} className="h-2" />
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Numeracy Progress
                </span>
                <span className="font-bold text-blue-600">
                  {weeklyReport.numeracyProgress}%
                </span>
              </div>
              <Progress value={weeklyReport.numeracyProgress} className="h-2" />
            </div>
          </div>

          {/* Strengths & Growth Areas */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Strong Areas</h4>
              <div className="flex flex-wrap gap-2">
                {weeklyReport.strongAreas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Areas for Growth</h4>
              <div className="flex flex-wrap gap-2">
                {weeklyReport.areasForGrowth.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Children Cards */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Your Children
            </h2>
            <Link
              href="/early-years/enroll"
              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Child
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {childrenSummary.map((summary) => {
              const avatar = getAvatar(summary.child.avatarId);
              const displayName = summary.child.preferredName || summary.child.firstName;

              return (
                <motion.div
                  key={summary.child.id}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl shadow-sm p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center text-4xl bg-gradient-to-br flex-shrink-0',
                        avatar.bg
                      )}
                    >
                      {avatar.emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-800">{displayName}</h3>
                        <MoodIndicator mood={summary.mood} />
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>{summary.thisWeekMinutes} min this week</span>
                        <span>{summary.thisWeekSessions} sessions</span>
                      </div>

                      {/* Progress */}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Phonics Phase {summary.phonicsPhase}</span>
                          <TrendIndicator trend={summary.engagementTrend} />
                        </div>
                        <div className="text-sm text-gray-600">
                          Numeracy: {summary.numeracyStage}
                        </div>
                      </div>

                      {/* Recent Achievements */}
                      {summary.recentAchievements.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-sm text-gray-500">Recent:</span>
                          {summary.recentAchievements.slice(0, 3).map((ach) => (
                            <span key={ach.id} title={ach.name} className="text-xl">
                              {ach.icon}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Recommendations */}
        <motion.section variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Recommendations for You
          </h2>

          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl',
                  rec.type === 'celebration'
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                    : rec.type === 'activity'
                    ? 'bg-blue-50 border border-blue-200'
                    : rec.type === 'offline_activity'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    rec.type === 'celebration'
                      ? 'bg-yellow-200 text-yellow-700'
                      : rec.type === 'activity'
                      ? 'bg-blue-200 text-blue-700'
                      : rec.type === 'offline_activity'
                      ? 'bg-green-200 text-green-700'
                      : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {rec.type === 'celebration' && '🎉'}
                  {rec.type === 'activity' && '📱'}
                  {rec.type === 'offline_activity' && '✏️'}
                  {rec.type === 'screen_time' && '⏰'}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  {rec.actionUrl && (
                    <Link
                      href={rec.actionUrl}
                      className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mt-2 font-medium"
                    >
                      Try it now <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    rec.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {rec.priority}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Upcoming Milestones */}
        <motion.section variants={itemVariants} className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-500" />
            Upcoming Milestones
          </h2>

          <div className="space-y-4">
            {upcomingMilestones.map((milestone) => (
              <div key={milestone.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-800">{milestone.title}</span>
                    <span className="text-sm text-gray-500">{milestone.childName}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                  <Progress value={milestone.progress} className="h-2" />
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-purple-600">{milestone.progress}%</div>
                  <div className="text-xs text-gray-500">
                    Expected: {new Date(milestone.expectedDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
}

// Helper Components
function StatCard({
  icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={cn('rounded-xl p-4', colors[color])}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && (
          <span
            className={cn(
              'text-xs font-medium flex items-center',
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            )}
          >
            {change > 0 ? '+' : ''}
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function MoodIndicator({ mood }: { mood: 'happy' | 'neutral' | 'struggling' }) {
  const moods = {
    happy: { emoji: '😊', color: 'text-green-500' },
    neutral: { emoji: '😐', color: 'text-gray-500' },
    struggling: { emoji: '😟', color: 'text-amber-500' },
  };
  const { emoji, color } = moods[mood];

  return <span className={cn('text-xl', color)}>{emoji}</span>;
}

function TrendIndicator({ trend }: { trend: 'up' | 'stable' | 'down' }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-green-600 text-xs">
        <TrendingUp className="w-3 h-3" /> Improving
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-1 text-red-600 text-xs">
        <TrendingDown className="w-3 h-3" /> Needs attention
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-gray-500 text-xs">
      <Minus className="w-3 h-3" /> Stable
    </span>
  );
}
