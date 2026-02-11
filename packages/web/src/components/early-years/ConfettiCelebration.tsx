'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFETTI_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A78BFA',
  '#34D399',
  '#FB923C',
  '#F472B6',
  '#60A5FA',
];

type ParticleShape = 'circle' | 'square' | 'triangle';

interface ParticleConfig {
  id: number;
  angle: number;
  velocity: number;
  rotationSpeed: number;
  color: string;
  shape: ParticleShape;
  size: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  intensity?: 'small' | 'medium' | 'large';
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

const INTENSITY_MAP: Record<
  NonNullable<ConfettiCelebrationProps['intensity']>,
  number
> = {
  small: 20,
  medium: 50,
  large: 100,
};

const SHAPES: ParticleShape[] = ['circle', 'square', 'triangle'];

function getShapeStyles(shape: ParticleShape): React.CSSProperties {
  switch (shape) {
    case 'circle':
      return { borderRadius: '9999px' };
    case 'square':
      return { borderRadius: '2px' };
    case 'triangle':
      return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
  }
}

export default function ConfettiCelebration({
  isActive,
  intensity = 'medium',
  duration = 2000,
  colors = CONFETTI_COLORS,
  onComplete,
}: ConfettiCelebrationProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const particles = useMemo<ParticleConfig[]>(() => {
    if (!isActive) return [];

    const count = INTENSITY_MAP[intensity];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: Math.random() * 360,
      velocity: 200 + Math.random() * 400,
      rotationSpeed: (Math.random() - 0.5) * 720,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      size: 8 + Math.random() * 6,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, intensity, colors]);

  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration]);

  const durationSeconds = duration / 1000;

  return (
    <AnimatePresence>
      {isActive && particles.length > 0 && (
        <div
          className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          aria-hidden="true"
        >
          {particles.map((particle) => {
            const angleRad = (particle.angle * Math.PI) / 180;
            const dx = Math.cos(angleRad) * particle.velocity;
            const dy = Math.sin(angleRad) * particle.velocity;

            return (
              <motion.div
                key={particle.id}
                initial={{
                  x: '50vw',
                  y: '50vh',
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  x: `calc(50vw + ${dx}px)`,
                  y: `calc(50vh + ${dy + 300}px)`,
                  scale: 0,
                  opacity: [1, 1, 0.8, 0],
                  rotate: particle.rotationSpeed,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: durationSeconds,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  opacity: {
                    duration: durationSeconds,
                    times: [0, 0.3, 0.7, 1],
                  },
                }}
                style={{
                  position: 'absolute',
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  willChange: 'transform',
                  ...getShapeStyles(particle.shape),
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
