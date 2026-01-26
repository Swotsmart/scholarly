'use client';

/**
 * Mentor Selector Component
 * Let children choose their learning companion
 */

import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MENTORS, type Mentor, type MentorInfo } from '@/types/early-years';

interface MentorSelectorProps {
  selectedMentor: Mentor | null;
  onSelectMentor: (mentor: Mentor) => void;
  onContinue: () => void;
  onBack: () => void;
}

const mentorEmojis: Record<Mentor, string> = {
  ollie_owl: '🦉',
  penny_penguin: '🐧',
  leo_lion: '🦁',
  bella_butterfly: '🦋',
};

const mentorColors: Record<Mentor, { bg: string; accent: string }> = {
  ollie_owl: {
    bg: 'from-amber-400 to-orange-500',
    accent: 'bg-amber-500',
  },
  penny_penguin: {
    bg: 'from-sky-400 to-blue-500',
    accent: 'bg-sky-500',
  },
  leo_lion: {
    bg: 'from-orange-400 to-red-500',
    accent: 'bg-orange-500',
  },
  bella_butterfly: {
    bg: 'from-pink-400 to-purple-500',
    accent: 'bg-pink-500',
  },
};

export function MentorSelector({
  selectedMentor,
  onSelectMentor,
  onContinue,
  onBack,
}: MentorSelectorProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
  };

  const speakCatchphrase = (mentor: MentorInfo) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(mentor.catchphrase);
      utterance.rate = 0.9;
      utterance.pitch = mentor.id === 'penny_penguin' ? 1.3 : 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Back Button */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ x: -5 }}
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Worlds</span>
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Pick Your Friend! 🤗
        </h1>
        <p className="text-lg text-gray-600">
          Who would you like to learn with today?
        </p>
      </motion.div>

      {/* Mentors Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8"
      >
        {MENTORS.map((mentor) => {
          const isSelected = selectedMentor === mentor.id;
          const colors = mentorColors[mentor.id];

          return (
            <motion.div key={mentor.id} variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectMentor(mentor.id)}
                className={cn(
                  'relative w-full rounded-3xl overflow-hidden text-center transition-all',
                  'shadow-xl hover:shadow-2xl bg-white',
                  isSelected && 'ring-4 ring-purple-500 ring-offset-2'
                )}
              >
                {/* Avatar Section */}
                <div
                  className={cn(
                    'h-32 md:h-40 flex items-center justify-center bg-gradient-to-br relative',
                    colors.bg
                  )}
                >
                  <motion.span
                    animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-6xl md:text-7xl"
                  >
                    {mentorEmojis[mentor.id]}
                  </motion.span>

                  {/* Sound Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakCatchphrase(mentor);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
                    title="Hear catchphrase"
                  >
                    <Volume2 className="w-4 h-4 text-white" />
                  </button>

                  {/* Selected Badge */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 left-2 px-2 py-1 rounded-full bg-white text-purple-600 text-xs font-bold"
                    >
                      Selected!
                    </motion.div>
                  )}
                </div>

                {/* Info Section */}
                <div className="p-4">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-1">
                    {mentor.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">{mentor.personality}</p>

                  {/* Speciality Badge */}
                  <div
                    className={cn(
                      'inline-block px-3 py-1 rounded-full text-white text-xs font-medium',
                      colors.accent
                    )}
                  >
                    {mentor.speciality}
                  </div>

                  {/* Catchphrase */}
                  <p className="mt-3 text-sm text-gray-600 italic">
                    "{mentor.catchphrase}"
                  </p>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Continue Button */}
      {selectedMentor && (
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
            Start Learning!
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </motion.div>
      )}

      {/* Help Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-gray-500 mt-6"
      >
        Tap the sound button 🔊 to hear your friend talk!
      </motion.p>
    </div>
  );
}
