'use client';

import { AnimatePresence, motion } from 'framer-motion';

const MENTOR_EMOJIS: Record<string, string> = {
  ollie_owl: '🦉',
  penny_penguin: '🐧',
  leo_lion: '🦁',
  bella_butterfly: '🦋',
};

interface VoiceCoachBubbleProps {
  message: string;
  isVisible: boolean;
  className?: string;
  mentor?: string;
}

export function VoiceCoachBubble({ message, isVisible, className, mentor }: VoiceCoachBubbleProps) {
  const emoji = mentor ? MENTOR_EMOJIS[mentor] || '🧑‍🏫' : '🧑‍🏫';

  return (
    <AnimatePresence>
      {isVisible && message && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className={className || 'mb-4 mx-auto max-w-sm'}
        >
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border-2 border-purple-200">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0">{emoji}</span>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{message}</p>
            </div>
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white/90 border-b-2 border-r-2 border-purple-200 rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
