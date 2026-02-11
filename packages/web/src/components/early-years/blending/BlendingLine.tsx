'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface BlendingLineProps {
  isActive: boolean;
  totalWidth: number;
  duration: number;
}

export function BlendingLine({ isActive, totalWidth, duration }: BlendingLineProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="absolute -bottom-6 left-1/2 h-1 rounded-full bg-gradient-to-r from-orange-300 via-orange-500 to-orange-300"
          initial={{ width: 0, x: '-50%', opacity: 0 }}
          animate={{ width: totalWidth, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration, ease: 'linear' }}
          style={{ transformOrigin: 'left center' }}
        >
          {/* Leading glow dot */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-400"
            style={{ boxShadow: '0 0 12px 4px rgba(251, 146, 60, 0.6)' }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
