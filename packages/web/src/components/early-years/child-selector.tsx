'use client';

/**
 * Child Selector Component
 * Allows parents/children to select which child profile to use
 */

import { motion } from 'framer-motion';
import { Star, Flame, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Child } from '@/types/early-years';

interface ChildSelectorProps {
  children: Child[];
  onSelectChild: (child: Child) => void;
  onAddChild?: () => void;
  onManageChildren?: () => void;
}

// Avatar options for children
const AVATARS: Record<string, { emoji: string; bg: string }> = {
  'avatar-bunny': { emoji: '🐰', bg: 'from-pink-400 to-rose-500' },
  'avatar-dinosaur': { emoji: '🦕', bg: 'from-green-400 to-emerald-500' },
  'avatar-unicorn': { emoji: '🦄', bg: 'from-purple-400 to-pink-500' },
  'avatar-dragon': { emoji: '🐉', bg: 'from-red-400 to-orange-500' },
  'avatar-penguin': { emoji: '🐧', bg: 'from-blue-400 to-cyan-500' },
  'avatar-lion': { emoji: '🦁', bg: 'from-amber-400 to-yellow-500' },
  'avatar-panda': { emoji: '🐼', bg: 'from-gray-400 to-slate-500' },
  'avatar-owl': { emoji: '🦉', bg: 'from-amber-500 to-brown-500' },
  'avatar-default': { emoji: '😊', bg: 'from-blue-400 to-indigo-500' },
};

function getAvatar(avatarId: string): { emoji: string; bg: string } {
  return AVATARS[avatarId] || AVATARS['avatar-default'];
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function ChildSelector({
  children,
  onSelectChild,
  onAddChild,
  onManageChildren,
}: ChildSelectorProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Who's Playing Today? 🎮
        </h1>
        <p className="text-lg text-gray-600">
          Tap on your picture to start learning!
        </p>
      </motion.div>

      {/* Children Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
      >
        {children.map((child) => {
          const avatar = getAvatar(child.avatarId);
          const age = calculateAge(child.dateOfBirth);
          const displayName = child.preferredName || child.firstName;

          return (
            <motion.button
              key={child.id}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectChild(child)}
              className="bg-white rounded-3xl shadow-xl overflow-hidden text-left transition-shadow hover:shadow-2xl"
            >
              {/* Avatar Section */}
              <div
                className={cn(
                  'h-32 flex items-center justify-center bg-gradient-to-br',
                  avatar.bg
                )}
              >
                <span className="text-7xl">{avatar.emoji}</span>
              </div>

              {/* Info Section */}
              <div className="p-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {displayName}
                </h2>
                <p className="text-gray-500 mb-3">{age} years old</p>

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold text-gray-700">
                      {child.totalStars}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold text-gray-700">
                      {child.currentStreak} day{child.currentStreak !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Level Badge */}
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold">
                  Level {child.level}
                </div>

                {/* Password Status */}
                {!child.hasPicturePassword && (
                  <div className="mt-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">
                    Needs picture password
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}

        {/* Add Child Card */}
        {onAddChild && (
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAddChild}
            className="bg-white rounded-3xl shadow-xl overflow-hidden text-center border-4 border-dashed border-gray-300 hover:border-purple-400 transition-colors min-h-[250px] flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700">Add a Child</h3>
            <p className="text-gray-500 mt-1">Create a new profile</p>
          </motion.button>
        )}
      </motion.div>

      {/* Empty State */}
      {children.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-white rounded-3xl shadow-lg"
        >
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome to Little Explorers!
          </h2>
          <p className="text-gray-600 mb-6">
            Let's add your first child to get started!
          </p>
          {onAddChild && (
            <button
              onClick={onAddChild}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Child
            </button>
          )}
        </motion.div>
      )}

      {/* Manage Children Link */}
      {onManageChildren && children.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <button
            onClick={onManageChildren}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Children
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Export avatar helper for use elsewhere
export { getAvatar, AVATARS };
