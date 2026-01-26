'use client';

/**
 * Child Dashboard Component
 * Shows progress, achievements, and recommended activities in a child-friendly way
 */

import { motion } from 'framer-motion';
import {
  Star,
  Flame,
  Trophy,
  Target,
  Play,
  BookOpen,
  Calculator,
  Palette,
  Music,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type {
  ChildDashboard as ChildDashboardType,
  Child,
  LearningWorld,
} from '@/types/early-years';
import { LEARNING_WORLDS, MENTORS } from '@/types/early-years';
import { getAvatar } from './child-selector';

interface ChildDashboardProps {
  dashboard: ChildDashboardType;
  onStartSession: () => void;
  onLogout: () => void;
}

const worldIcons: Record<LearningWorld, React.ReactNode> = {
  phonics_forest: <BookOpen className="w-5 h-5" />,
  number_land: <Calculator className="w-5 h-5" />,
  story_garden: <BookOpen className="w-5 h-5" />,
  creative_cove: <Palette className="w-5 h-5" />,
};

export function ChildDashboard({
  dashboard,
  onStartSession,
  onLogout,
}: ChildDashboardProps) {
  const { child, weeklyGoal, phonicsProgress, numeracyProgress, achievements, recommendedActivities } =
    dashboard;
  const avatar = getAvatar(child.avatarId);
  const displayName = child.preferredName || child.firstName;

  // Calculate weekly progress percentage
  const weeklyProgressPercent = Math.round(
    (weeklyGoal.completedSessions / weeklyGoal.targetSessions) * 100
  );

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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white shadow-md sticky top-0 z-10"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Profile */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br',
                avatar.bg
              )}
            >
              {avatar.emoji}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Hi, {displayName}! 👋
              </h1>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-yellow-600">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  {child.totalStars}
                </span>
                <span className="flex items-center gap-1 text-orange-600">
                  <Flame className="w-4 h-4" />
                  {child.currentStreak} days
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                  Level {child.level}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartSession}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow"
            >
              <Play className="w-5 h-5" />
              <span className="hidden sm:inline">Play!</span>
            </motion.button>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Switch child"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-4 py-6 space-y-6"
      >
        {/* Weekly Goal Progress */}
        <motion.section
          variants={itemVariants}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-500" />
              This Week's Goal
            </h2>
            <span className="text-2xl font-bold text-purple-600">
              {weeklyProgressPercent}%
            </span>
          </div>

          <Progress value={weeklyProgressPercent} className="h-4 mb-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-600">
                {weeklyGoal.completedSessions}/{weeklyGoal.targetSessions}
              </div>
              <div className="text-sm text-blue-800">Sessions</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">
                {weeklyGoal.completedMinutes}/{weeklyGoal.targetMinutes}
              </div>
              <div className="text-sm text-green-800">Minutes</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-yellow-600">
                {weeklyGoal.earnedStars}/{weeklyGoal.targetStars}
              </div>
              <div className="text-sm text-yellow-800">Stars</div>
            </div>
          </div>
        </motion.section>

        {/* Progress Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Phonics Progress */}
          <motion.section
            variants={itemVariants}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🌲</span>
              <div>
                <h2 className="text-xl font-bold">Phonics Forest</h2>
                <p className="text-emerald-100">
                  Phase {phonicsProgress.currentPhase}: {phonicsProgress.phaseName}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Letters Learned</span>
                  <span>
                    {phonicsProgress.graphemesLearned.length}/
                    {phonicsProgress.totalGraphemes}
                  </span>
                </div>
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        (phonicsProgress.graphemesLearned.length /
                          phonicsProgress.totalGraphemes) *
                        100
                      }%`,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-white rounded-full"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {phonicsProgress.graphemesInProgress.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-1 bg-white/20 rounded-lg text-sm font-mono"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="text-sm">
                Accuracy: <span className="font-bold">{phonicsProgress.accuracy}%</span>
              </div>
            </div>
          </motion.section>

          {/* Numeracy Progress */}
          <motion.section
            variants={itemVariants}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-lg p-6 text-white"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🔢</span>
              <div>
                <h2 className="text-xl font-bold">Number Land</h2>
                <p className="text-blue-100">Stage: {numeracyProgress.currentStage}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/20 rounded-xl p-2">
                  <div className="text-xl font-bold">
                    {numeracyProgress.numberRecognition}%
                  </div>
                  <div className="text-xs">Numbers</div>
                </div>
                <div className="bg-white/20 rounded-xl p-2">
                  <div className="text-xl font-bold">{numeracyProgress.counting}%</div>
                  <div className="text-xs">Counting</div>
                </div>
                <div className="bg-white/20 rounded-xl p-2">
                  <div className="text-xl font-bold">{numeracyProgress.operations}%</div>
                  <div className="text-xs">Maths</div>
                </div>
              </div>

              <div className="text-sm">
                <span className="font-medium">Learning now:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {numeracyProgress.conceptsInProgress.slice(0, 2).map((c) => (
                    <span
                      key={c}
                      className="px-2 py-1 bg-white/20 rounded-lg text-xs"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Achievements */}
        <motion.section variants={itemVariants} className="bg-white rounded-3xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Recent Badges
            </h2>
            <button className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'flex-shrink-0 w-24 text-center p-3 rounded-2xl',
                  achievement.rarity === 'legendary'
                    ? 'bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-yellow-400'
                    : achievement.rarity === 'epic'
                    ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-400'
                    : achievement.rarity === 'rare'
                    ? 'bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-400'
                    : 'bg-gray-100 border-2 border-gray-300'
                )}
              >
                <span className="text-4xl block mb-1">{achievement.icon}</span>
                <span className="text-xs font-medium text-gray-700 line-clamp-2">
                  {achievement.name}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Recommended Activities */}
        <motion.section variants={itemVariants} className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Music className="w-6 h-6 text-pink-500" />
            What to Try Next
          </h2>

          <div className="space-y-3">
            {recommendedActivities.map((activity, index) => {
              const world = LEARNING_WORLDS.find((w) => w.id === activity.world);
              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.01, x: 5 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onStartSession}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl text-left transition-colors"
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                      world?.bgGradient || 'from-gray-400 to-gray-600'
                    )}
                  >
                    {worldIcons[activity.world]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 capitalize">
                      {activity.activityType.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{activity.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm">{activity.estimatedMinutes} min</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* Big Play Button */}
        <motion.div variants={itemVariants} className="text-center pb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartSession}
            className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-3xl text-2xl font-bold shadow-xl hover:shadow-2xl transition-shadow"
          >
            <Play className="w-8 h-8" />
            Let's Play!
          </motion.button>
        </motion.div>
      </motion.main>
    </div>
  );
}
