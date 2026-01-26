'use client';

/**
 * World Selector Component
 * Let children choose their learning world adventure
 */

import { motion } from 'framer-motion';
import { Lock, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEARNING_WORLDS, type LearningWorld, type WorldInfo } from '@/types/early-years';

interface WorldSelectorProps {
  currentLevel: number;
  selectedWorld: LearningWorld | null;
  onSelectWorld: (world: LearningWorld) => void;
  onContinue: () => void;
}

const worldEmojis: Record<LearningWorld, string> = {
  phonics_forest: '🌲',
  number_land: '🔢',
  story_garden: '📚',
  creative_cove: '🎨',
};

const worldBackgrounds: Record<LearningWorld, string> = {
  phonics_forest: 'from-emerald-400 via-green-500 to-teal-600',
  number_land: 'from-blue-400 via-indigo-500 to-purple-600',
  story_garden: 'from-purple-400 via-pink-500 to-rose-500',
  creative_cove: 'from-orange-400 via-amber-500 to-yellow-500',
};

export function WorldSelector({
  currentLevel,
  selectedWorld,
  onSelectWorld,
  onContinue,
}: WorldSelectorProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const isWorldUnlocked = (world: WorldInfo) => currentLevel >= world.unlockedAt;

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Choose Your World! 🗺️
        </h1>
        <p className="text-lg text-gray-600">
          Where would you like to explore today?
        </p>
      </motion.div>

      {/* Worlds Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
      >
        {LEARNING_WORLDS.map((world) => {
          const isUnlocked = isWorldUnlocked(world);
          const isSelected = selectedWorld === world.id;

          return (
            <motion.button
              key={world.id}
              variants={itemVariants}
              whileHover={isUnlocked ? { scale: 1.02, y: -5 } : {}}
              whileTap={isUnlocked ? { scale: 0.98 } : {}}
              onClick={() => isUnlocked && onSelectWorld(world.id)}
              disabled={!isUnlocked}
              className={cn(
                'relative rounded-3xl overflow-hidden text-left transition-all',
                'shadow-xl hover:shadow-2xl',
                isSelected && 'ring-4 ring-white ring-offset-4 ring-offset-purple-500',
                !isUnlocked && 'opacity-60 cursor-not-allowed'
              )}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br',
                  worldBackgrounds[world.id]
                )}
              />

              {/* Content */}
              <div className="relative p-6 text-white">
                {/* Icon */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-6xl">{worldEmojis[world.id]}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
                    >
                      <Sparkles className="w-6 h-6 text-purple-500" />
                    </motion.div>
                  )}
                  {!isUnlocked && (
                    <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <h2 className="text-2xl font-bold mb-2">{world.name}</h2>
                <p className="text-white/90 mb-4">{world.description}</p>

                {/* Subjects Tags */}
                <div className="flex flex-wrap gap-2">
                  {world.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-3 py-1 rounded-full bg-white/20 text-sm font-medium"
                    >
                      {subject}
                    </span>
                  ))}
                </div>

                {/* Unlock Message */}
                {!isUnlocked && (
                  <div className="mt-4 flex items-center gap-2 text-white/80">
                    <Lock className="w-4 h-4" />
                    <span>Unlocks at Level {world.unlockedAt}</span>
                  </div>
                )}
              </div>

              {/* Decorative Elements */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -top-4 -left-4 w-24 h-24 rounded-full bg-white/5" />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Continue Button */}
      {selectedWorld && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onContinue}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
          >
            Let's Go!
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
