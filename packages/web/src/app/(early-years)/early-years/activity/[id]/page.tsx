'use client';

/**
 * Activity Player Page (Little Explorers)
 * UI/UX Design System v2.0 Compliant
 *
 * Features:
 * - Large touch targets (44px minimum)
 * - Drag-and-drop, tap, swipe gestures
 * - Immediate celebratory feedback (stars, sounds, animations)
 * - Progressive hints after wrong attempts
 * - Adaptive difficulty (75-85% success rate)
 * - Mentor character provides encouragement
 * - Visual star/stamp collection progress
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Volume2,
  Star,
  Heart,
  Sparkles,
  HelpCircle,
  Home,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { MENTORS, type Mentor } from '@/types/early-years';

// Design System v2.0: Minimum touch target size
const TOUCH_TARGET_SIZE = 44;

// Difficulty levels for adaptive learning (target 75-85% success rate)
const DIFFICULTY_LEVELS = {
  1: { hintDelay: 5000, maxAttempts: 5, successThreshold: 0.75 },
  2: { hintDelay: 7000, maxAttempts: 4, successThreshold: 0.78 },
  3: { hintDelay: 10000, maxAttempts: 3, successThreshold: 0.82 },
  4: { hintDelay: 15000, maxAttempts: 2, successThreshold: 0.85 },
};

// Activity types
type ActivityType = 'matching' | 'sorting' | 'counting' | 'tracing' | 'story';

// Demo activity data
interface ActivityItem {
  id: string;
  type: 'image' | 'letter' | 'number' | 'word';
  content: string;
  emoji?: string;
  targetZone?: string;
  audioPrompt?: string;
}

interface ActivityData {
  id: string;
  title: string;
  type: ActivityType;
  instruction: string;
  audioInstruction: string;
  items: ActivityItem[];
  targetZones?: { id: string; label: string; emoji?: string }[];
  correctAnswers: Record<string, string>;
  mentorTips: string[];
  celebrationMessages: string[];
}

// Demo activities
const DEMO_ACTIVITIES: Record<string, ActivityData> = {
  'letter-match': {
    id: 'letter-match',
    title: 'Letter Match',
    type: 'matching',
    instruction: 'Drag the letters to their matching pictures!',
    audioInstruction: 'Can you match the letters to the pictures that start with that sound?',
    items: [
      { id: 'a', type: 'letter', content: 'A', emoji: 'A', audioPrompt: 'A is for Apple' },
      { id: 'b', type: 'letter', content: 'B', emoji: 'B', audioPrompt: 'B is for Ball' },
      { id: 'c', type: 'letter', content: 'C', emoji: 'C', audioPrompt: 'C is for Cat' },
    ],
    targetZones: [
      { id: 'apple', label: 'Apple', emoji: '🍎' },
      { id: 'ball', label: 'Ball', emoji: '⚽' },
      { id: 'cat', label: 'Cat', emoji: '🐱' },
    ],
    correctAnswers: { a: 'apple', b: 'ball', c: 'cat' },
    mentorTips: [
      "Listen to the sound the letter makes!",
      "What does the picture start with?",
      "You're doing great! Keep trying!",
    ],
    celebrationMessages: [
      "Amazing job! You're a star!",
      "Woohoo! That's correct!",
      "You did it! High five!",
    ],
  },
  'number-count': {
    id: 'number-count',
    title: 'Count with Me',
    type: 'counting',
    instruction: 'Tap the objects to count them!',
    audioInstruction: 'Let\'s count together! Tap each object.',
    items: [
      { id: '1', type: 'number', content: '🍎', emoji: '🍎' },
      { id: '2', type: 'number', content: '🍎', emoji: '🍎' },
      { id: '3', type: 'number', content: '🍎', emoji: '🍎' },
      { id: '4', type: 'number', content: '🍎', emoji: '🍎' },
      { id: '5', type: 'number', content: '🍎', emoji: '🍎' },
    ],
    correctAnswers: { count: '5' },
    mentorTips: [
      "Tap each apple one at a time!",
      "Don't forget to count slowly!",
      "How many apples do you see?",
    ],
    celebrationMessages: [
      "That's right! Five apples!",
      "You counted perfectly!",
      "Great counting skills!",
    ],
  },
  'color-sort': {
    id: 'color-sort',
    title: 'Color Sort',
    type: 'sorting',
    instruction: 'Sort the items by color!',
    audioInstruction: 'Can you put the items in the right color box?',
    items: [
      { id: 'red1', type: 'image', content: '🍎', targetZone: 'red' },
      { id: 'blue1', type: 'image', content: '🫐', targetZone: 'blue' },
      { id: 'yellow1', type: 'image', content: '🍋', targetZone: 'yellow' },
      { id: 'red2', type: 'image', content: '🍓', targetZone: 'red' },
      { id: 'blue2', type: 'image', content: '🐳', targetZone: 'blue' },
    ],
    targetZones: [
      { id: 'red', label: 'Red', emoji: '🔴' },
      { id: 'blue', label: 'Blue', emoji: '🔵' },
      { id: 'yellow', label: 'Yellow', emoji: '🟡' },
    ],
    correctAnswers: { red1: 'red', blue1: 'blue', yellow1: 'yellow', red2: 'red', blue2: 'blue' },
    mentorTips: [
      "Look at the color carefully!",
      "Which box has the same color?",
      "You're sorting so well!",
    ],
    celebrationMessages: [
      "Perfect sorting!",
      "You know your colors!",
      "Fantastic work!",
    ],
  },
};

// Star burst celebration component
function CelebrationOverlay({
  show,
  message,
  onComplete,
}: {
  show: boolean;
  message: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="relative"
      >
        {/* Stars burst */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0 }}
            animate={{
              x: Math.cos((i * 30 * Math.PI) / 180) * 150,
              y: Math.sin((i * 30 * Math.PI) / 180) * 150,
              scale: [0, 1.5, 0],
              rotate: 360,
            }}
            transition={{ duration: 1, delay: i * 0.05 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </motion.div>
        ))}

        {/* Main content */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-2xl text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-7xl mb-4"
          >
            🌟
          </motion.div>
          <h2 className="text-2xl font-bold text-purple-600 mb-2">Amazing!</h2>
          <p className="text-lg text-gray-600">{message}</p>

          {/* Collected stars */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-2 mt-4"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5 + star * 0.1 }}
              >
                <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Mentor character component
function MentorCharacter({
  mentor,
  message,
  isHinting,
  onSpeak,
}: {
  mentor: Mentor;
  message: string;
  isHinting: boolean;
  onSpeak: (text: string) => void;
}) {
  const mentorInfo = MENTORS.find((m) => m.id === mentor);
  const mentorEmoji: Record<Mentor, string> = {
    ollie_owl: '🦉',
    penny_penguin: '🐧',
    leo_lion: '🦁',
    bella_butterfly: '🦋',
  };

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed bottom-4 left-4 z-30"
    >
      <motion.div
        animate={isHinting ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: isHinting ? Infinity : 0, duration: 0.5 }}
        className="relative"
      >
        {/* Speech bubble */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
              className="absolute bottom-full left-12 mb-2 bg-white rounded-2xl p-3 shadow-lg max-w-[200px]"
            >
              <p className="text-sm font-medium text-gray-700">{message}</p>
              <div className="absolute bottom-0 left-4 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mentor avatar button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onSpeak(message || mentorInfo?.catchphrase || '')}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center text-4xl shadow-lg",
            "bg-gradient-to-br",
            mentor === 'ollie_owl' && "from-amber-400 to-orange-500",
            mentor === 'penny_penguin' && "from-sky-400 to-blue-500",
            mentor === 'leo_lion' && "from-orange-400 to-red-500",
            mentor === 'bella_butterfly' && "from-pink-400 to-purple-500",
            isHinting && "ring-4 ring-yellow-300 ring-opacity-75"
          )}
          style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
        >
          {mentorEmoji[mentor]}
        </motion.button>

        {/* Help indicator */}
        {isHinting && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
          >
            <HelpCircle className="w-4 h-4 text-yellow-800" />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Draggable item component
function DraggableItem({
  item,
  onDragEnd,
  disabled,
}: {
  item: ActivityItem;
  onDragEnd: (item: ActivityItem, info: PanInfo) => void;
  disabled: boolean;
}) {
  const controls = useDragControls();

  return (
    <motion.div
      drag={!disabled}
      dragControls={controls}
      dragElastic={0.1}
      dragSnapToOrigin
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      whileTap={{ scale: 0.95 }}
      onDragEnd={(_, info) => onDragEnd(item, info)}
      className={cn(
        "w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing",
        "bg-white border-4 border-purple-200 hover:border-purple-400 transition-colors",
        disabled && "opacity-50 cursor-not-allowed",
        "min-w-[80px] min-h-[80px]" // Large touch target
      )}
    >
      <span className="text-4xl">{item.emoji || item.content}</span>
    </motion.div>
  );
}

// Drop zone component
function DropZone({
  zone,
  isHighlighted,
  hasItem,
  isCorrect,
}: {
  zone: { id: string; label: string; emoji?: string };
  isHighlighted: boolean;
  hasItem: boolean;
  isCorrect: boolean | null;
}) {
  return (
    <motion.div
      animate={{
        scale: isHighlighted ? 1.05 : 1,
        borderColor: isHighlighted
          ? '#a855f7'
          : isCorrect === true
          ? '#22c55e'
          : isCorrect === false
          ? '#ef4444'
          : '#e5e7eb',
      }}
      className={cn(
        "w-24 h-24 rounded-2xl flex flex-col items-center justify-center",
        "border-4 border-dashed transition-all",
        isCorrect === true && "bg-green-50 border-green-500",
        isCorrect === false && "bg-red-50 border-red-500",
        !isCorrect && hasItem && "bg-purple-50",
        "min-w-[96px] min-h-[96px]" // Large touch target
      )}
    >
      <span className="text-3xl mb-1">{zone.emoji}</span>
      <span className="text-xs font-medium text-gray-600">{zone.label}</span>
      {isCorrect === true && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute"
        >
          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
        </motion.div>
      )}
    </motion.div>
  );
}

// Progress stars component
function ProgressStars({
  current,
  total,
  starsEarned,
}: {
  current: number;
  total: number;
  starsEarned: number;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* Progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">
          {current}/{total}
        </span>
        <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(current / total) * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          />
        </div>
      </div>

      {/* Stars earned */}
      <div className="flex items-center gap-1">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
        <span className="font-bold text-yellow-600">{starsEarned}</span>
      </div>
    </div>
  );
}

export default function ActivityPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const activityId = params.id as string;

  const { activeChild, selectedMentor, currentSession } = useEarlyYearsStore();

  // Activity state
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [starsEarned, setStarsEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [mentorMessage, setMentorMessage] = useState('');
  const [isHinting, setIsHinting] = useState(false);
  const [difficulty, setDifficulty] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null);
  const [zoneResults, setZoneResults] = useState<Record<string, boolean>>({});
  const [isActivityComplete, setIsActivityComplete] = useState(false);

  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const difficultyConfig = DIFFICULTY_LEVELS[difficulty as keyof typeof DIFFICULTY_LEVELS];

  // Load activity data
  useEffect(() => {
    // Map activity IDs to demo activities
    const activityMap: Record<string, string> = {
      'numbers': 'number-count',
      'letters': 'letter-match',
      'colors': 'color-sort',
      'stories': 'letter-match', // fallback
      'art': 'color-sort', // fallback
    };

    const mappedId = activityMap[activityId] || activityId;
    const activityData = DEMO_ACTIVITIES[mappedId] || DEMO_ACTIVITIES['letter-match'];
    setActivity(activityData);

    // Initial mentor message
    setMentorMessage(activityData.audioInstruction);
    speakMessage(activityData.audioInstruction);
  }, [activityId]);

  // Text-to-speech helper
  const speakMessage = useCallback((message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Hint timer
  useEffect(() => {
    if (isPaused || isActivityComplete) return;

    hintTimerRef.current = setTimeout(() => {
      if (activity && !isActivityComplete) {
        const tipIndex = Math.min(incorrectAttempts, activity.mentorTips.length - 1);
        setMentorMessage(activity.mentorTips[tipIndex]);
        speakMessage(activity.mentorTips[tipIndex]);
        setIsHinting(true);
      }
    }, difficultyConfig.hintDelay);

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [
    currentItemIndex,
    incorrectAttempts,
    isPaused,
    isActivityComplete,
    activity,
    difficultyConfig.hintDelay,
    speakMessage,
  ]);

  // Handle drag end for matching/sorting activities
  const handleDragEnd = useCallback(
    (item: ActivityItem, info: PanInfo) => {
      if (!activity) return;

      // Find which zone was dropped on (simplified - in production would use proper hit testing)
      const dropZone = activity.targetZones?.find((zone) => {
        // Simplified zone detection - would need proper bounds checking
        return zone.id === item.targetZone || activity.correctAnswers[item.id] === zone.id;
      });

      if (dropZone && activity.correctAnswers[item.id] === dropZone.id) {
        // Correct answer
        setCompletedItems((prev) => new Set(prev).add(item.id));
        setZoneResults((prev) => ({ ...prev, [dropZone.id]: true }));
        setStarsEarned((prev) => prev + 1);
        setIsHinting(false);

        // Celebration feedback
        const message =
          activity.celebrationMessages[
            Math.floor(Math.random() * activity.celebrationMessages.length)
          ];
        setCelebrationMessage(message);
        speakMessage(message);

        // Check if activity is complete
        if (completedItems.size + 1 >= activity.items.length) {
          setShowCelebration(true);
          setIsActivityComplete(true);
        } else {
          setCurrentItemIndex((prev) => prev + 1);
        }

        // Adjust difficulty based on success rate
        const successRate = (completedItems.size + 1) / (completedItems.size + incorrectAttempts + 1);
        if (successRate > 0.85 && difficulty < 4) {
          setDifficulty((prev) => prev + 1);
        }
      } else {
        // Wrong answer
        setIncorrectAttempts((prev) => prev + 1);
        setZoneResults((prev) => ({ ...prev, [dropZone?.id || '']: false }));

        // Show encouragement
        const tip = activity.mentorTips[Math.min(incorrectAttempts, activity.mentorTips.length - 1)];
        setMentorMessage(tip);
        speakMessage(tip);
        setIsHinting(true);

        // Reset wrong indicator after delay
        setTimeout(() => {
          setZoneResults((prev) => {
            const newResults = { ...prev };
            delete newResults[dropZone?.id || ''];
            return newResults;
          });
        }, 1000);

        // Adjust difficulty based on failure rate
        const successRate = completedItems.size / (completedItems.size + incorrectAttempts + 1);
        if (successRate < 0.75 && difficulty > 1) {
          setDifficulty((prev) => prev - 1);
        }
      }
    },
    [activity, completedItems, incorrectAttempts, difficulty, speakMessage]
  );

  // Handle counting tap
  const handleCountTap = useCallback(
    (item: ActivityItem) => {
      if (!activity || activity.type !== 'counting') return;

      if (!completedItems.has(item.id)) {
        setCompletedItems((prev) => new Set(prev).add(item.id));
        speakMessage((completedItems.size + 1).toString());

        if (completedItems.size + 1 >= activity.items.length) {
          const correctCount = activity.correctAnswers.count;
          if ((completedItems.size + 1).toString() === correctCount) {
            setStarsEarned((prev) => prev + 3);
            setCelebrationMessage(
              activity.celebrationMessages[
                Math.floor(Math.random() * activity.celebrationMessages.length)
              ]
            );
            setShowCelebration(true);
            setIsActivityComplete(true);
          }
        }
      }
    },
    [activity, completedItems, speakMessage]
  );

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    // Navigate back or to next activity
    router.push('/early-years');
  };

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-purple-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-6xl"
        >
          🌟
        </motion.div>
      </div>
    );
  }

  const mentor = selectedMentor || 'ollie_owl';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50">
      {/* Celebration overlay */}
      <AnimatePresence>
        <CelebrationOverlay
          show={showCelebration}
          message={celebrationMessage}
          onComplete={handleCelebrationComplete}
        />
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Back button - Large touch target */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/early-years')}
            className="flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors h-11 w-11"
            style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </motion.button>

          {/* Title */}
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              {activity.type === 'matching' && '🎯'}
              {activity.type === 'counting' && '🔢'}
              {activity.type === 'sorting' && '📦'}
              {activity.type === 'tracing' && '✏️'}
              {activity.type === 'story' && '📚'}
            </motion.span>
            <span className="font-bold text-lg text-purple-600">{activity.title}</span>
          </div>

          {/* Progress and pause */}
          <div className="flex items-center gap-2">
            <ProgressStars
              current={completedItems.size}
              total={activity.items.length}
              starsEarned={starsEarned}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors h-11 w-11"
              style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-gray-600" />
              ) : (
                <Pause className="w-5 h-5 text-gray-600" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main activity area */}
      <main className="pt-20 pb-24 px-4 min-h-screen">
        {/* Instruction */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => speakMessage(activity.instruction)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow"
          >
            <Volume2 className="w-5 h-5 text-purple-500" />
            <span className="text-lg font-medium text-gray-700">{activity.instruction}</span>
          </motion.button>
        </motion.div>

        {/* Activity content based on type */}
        {activity.type === 'matching' && (
          <div className="max-w-2xl mx-auto">
            {/* Drop zones */}
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              {activity.targetZones?.map((zone) => (
                <DropZone
                  key={zone.id}
                  zone={zone}
                  isHighlighted={highlightedZone === zone.id}
                  hasItem={completedItems.has(
                    Object.keys(activity.correctAnswers).find(
                      (k) => activity.correctAnswers[k] === zone.id
                    ) || ''
                  )}
                  isCorrect={zoneResults[zone.id] ?? null}
                />
              ))}
            </div>

            {/* Draggable items */}
            <div className="flex justify-center gap-4 flex-wrap">
              {activity.items.map((item) => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  onDragEnd={handleDragEnd}
                  disabled={completedItems.has(item.id) || isPaused}
                />
              ))}
            </div>
          </div>
        )}

        {activity.type === 'counting' && (
          <div className="max-w-2xl mx-auto text-center">
            {/* Counting items */}
            <div className="flex justify-center gap-4 flex-wrap mb-8">
              {activity.items.map((item) => (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleCountTap(item)}
                  disabled={completedItems.has(item.id) || isPaused}
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center text-5xl",
                    "transition-all shadow-lg",
                    completedItems.has(item.id)
                      ? "bg-green-100 border-4 border-green-500"
                      : "bg-white border-4 border-purple-200 hover:border-purple-400",
                    "min-w-[80px] min-h-[80px]"
                  )}
                  style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                >
                  {item.emoji}
                  {completedItems.has(item.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2"
                    >
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {Array.from(completedItems).indexOf(item.id) + 1}
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Count display */}
            <motion.div
              key={completedItems.size}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="text-6xl font-bold text-purple-600"
            >
              {completedItems.size}
            </motion.div>
          </div>
        )}

        {activity.type === 'sorting' && (
          <div className="max-w-2xl mx-auto">
            {/* Drop zones */}
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              {activity.targetZones?.map((zone) => (
                <DropZone
                  key={zone.id}
                  zone={zone}
                  isHighlighted={highlightedZone === zone.id}
                  hasItem={false}
                  isCorrect={zoneResults[zone.id] ?? null}
                />
              ))}
            </div>

            {/* Draggable items */}
            <div className="flex justify-center gap-4 flex-wrap">
              {activity.items.map((item) => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  onDragEnd={handleDragEnd}
                  disabled={completedItems.has(item.id) || isPaused}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mentor character */}
      <MentorCharacter
        mentor={mentor}
        message={mentorMessage}
        isHinting={isHinting}
        onSpeak={speakMessage}
      />

      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-3xl p-8 text-center max-w-sm mx-4"
            >
              <div className="text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Taking a Break?</h2>
              <div className="flex flex-col gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPaused(false)}
                  className="py-4 px-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg"
                  style={{ minHeight: TOUCH_TARGET_SIZE }}
                >
                  Keep Playing!
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/early-years')}
                  className="py-4 px-8 bg-gray-100 text-gray-700 rounded-2xl font-medium"
                  style={{ minHeight: TOUCH_TARGET_SIZE }}
                >
                  Go Home
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
