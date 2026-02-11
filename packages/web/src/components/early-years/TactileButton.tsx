'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TactileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'warning' | 'fun';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANTS = {
  primary: {
    bg: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
    shadow: 'rgba(139, 92, 246, 0.5)',
    text: 'text-white',
  },
  success: {
    bg: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    shadow: 'rgba(16, 185, 129, 0.5)',
    text: 'text-white',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-400 to-orange-500',
    shadow: 'rgba(245, 158, 11, 0.5)',
    text: 'text-white',
  },
  fun: {
    bg: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500',
    shadow: 'rgba(168, 85, 247, 0.5)',
    text: 'text-white',
  },
} as const;

const SIZE_CLASSES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
} as const;

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 15 };

export default function TactileButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  className = '',
}: TactileButtonProps) {
  const variantStyle = VARIANTS[variant];

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        variantStyle.bg,
        variantStyle.text,
        SIZE_CLASSES[size],
        'font-bold rounded-2xl',
        'inline-flex items-center justify-center',
        'min-h-[44px] min-w-[44px]',
        'select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-400',
        icon ? 'gap-2' : '',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        boxShadow: `0 6px 0 0 ${variantStyle.shadow}`,
        willChange: 'transform',
      }}
      initial={false}
      animate={{
        y: -3,
        boxShadow: `0 6px 0 0 ${variantStyle.shadow}`,
      }}
      whileHover={
        disabled
          ? undefined
          : {
              y: -4,
              scale: 1.02,
              boxShadow: `0 8px 0 0 ${variantStyle.shadow}`,
            }
      }
      whileTap={
        disabled
          ? undefined
          : {
              y: 0,
              scale: 1,
              boxShadow: `0 2px 0 0 ${variantStyle.shadow}`,
            }
      }
      transition={springTransition}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
