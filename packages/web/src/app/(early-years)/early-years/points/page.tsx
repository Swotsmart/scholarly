'use client';

/**
 * Explorer Points Dashboard Page (Little Explorers)
 * UI/UX Design System v2.0 Compliant
 *
 * Features:
 * - Class View: Student avatars with point totals
 * - Award Interface: One-tap point giving with categories
 * - Categories: Kind hearts, helping hands, great listening
 * - Class-wide celebrations at milestones
 * - Real-time parent notifications
 *
 * This page is designed for teachers to award points to students
 * and for students to view their collected points
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Heart,
  HeartHandshake,
  Ear,
  Sparkles,
  Trophy,
  Crown,
  Gift,
  Bell,
  Users,
  Plus,
  Minus,
  Volume2,
  PartyPopper,
  Target,
  Zap,
  Home,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { getAvatar } from '@/components/early-years/child-selector';

// Design System v2.0: Minimum touch target size
const TOUCH_TARGET_SIZE = 44;

// Point categories with child-friendly icons and colors
const POINT_CATEGORIES = [
  {
    id: 'kind-heart',
    name: 'Kind Heart',
    icon: '💖',
    lucideIcon: Heart,
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-600',
    description: 'Being kind and caring to others',
    points: 1,
    audio: 'You have a kind heart!',
  },
  {
    id: 'helping-hands',
    name: 'Helping Hands',
    icon: '🤝',
    lucideIcon: HeartHandshake,
    color: 'from-blue-400 to-indigo-500',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    description: 'Helping friends and teachers',
    points: 1,
    audio: 'Thank you for helping!',
  },
  {
    id: 'great-listening',
    name: 'Great Listening',
    icon: '👂',
    lucideIcon: Ear,
    color: 'from-green-400 to-emerald-500',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    description: 'Listening carefully and following instructions',
    points: 1,
    audio: 'Great listening skills!',
  },
  {
    id: 'super-star',
    name: 'Super Star',
    icon: '⭐',
    lucideIcon: Star,
    color: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    description: 'Going above and beyond',
    points: 2,
    audio: 'You are a super star!',
  },
  {
    id: 'team-player',
    name: 'Team Player',
    icon: '🏆',
    lucideIcon: Trophy,
    color: 'from-purple-400 to-violet-500',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    description: 'Working well with others',
    points: 1,
    audio: 'Great teamwork!',
  },
  {
    id: 'brave-explorer',
    name: 'Brave Explorer',
    icon: '🦁',
    lucideIcon: Zap,
    color: 'from-orange-400 to-red-500',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    description: 'Trying new things and being brave',
    points: 2,
    audio: 'You are so brave!',
  },
];

// Milestone celebrations
const MILESTONES = [
  { points: 10, emoji: '🌟', message: '10 points! Amazing start!', reward: 'Bronze Badge' },
  { points: 25, emoji: '🏅', message: '25 points! Keep it up!', reward: 'Silver Badge' },
  { points: 50, emoji: '🏆', message: '50 points! Halfway hero!', reward: 'Gold Badge' },
  { points: 75, emoji: '👑', message: '75 points! Almost there!', reward: 'Platinum Badge' },
  { points: 100, emoji: '🎉', message: '100 points! Champion!', reward: 'Diamond Badge' },
];

// Demo student data
interface Student {
  id: string;
  name: string;
  avatarId: string;
  points: number;
  recentAwards: { category: string; timestamp: Date }[];
  badges: string[];
}

const DEMO_STUDENTS: Student[] = [
  {
    id: 'student-1',
    name: 'Lily',
    avatarId: 'avatar-bunny',
    points: 47,
    recentAwards: [
      { category: 'kind-heart', timestamp: new Date() },
      { category: 'great-listening', timestamp: new Date(Date.now() - 3600000) },
    ],
    badges: ['Bronze Badge', 'Silver Badge'],
  },
  {
    id: 'student-2',
    name: 'Max',
    avatarId: 'avatar-dinosaur',
    points: 32,
    recentAwards: [
      { category: 'helping-hands', timestamp: new Date() },
    ],
    badges: ['Bronze Badge', 'Silver Badge'],
  },
  {
    id: 'student-3',
    name: 'Emma',
    avatarId: 'avatar-unicorn',
    points: 58,
    recentAwards: [
      { category: 'super-star', timestamp: new Date() },
      { category: 'team-player', timestamp: new Date(Date.now() - 7200000) },
    ],
    badges: ['Bronze Badge', 'Silver Badge', 'Gold Badge'],
  },
  {
    id: 'student-4',
    name: 'Oliver',
    avatarId: 'avatar-lion',
    points: 23,
    recentAwards: [],
    badges: ['Bronze Badge'],
  },
  {
    id: 'student-5',
    name: 'Sophie',
    avatarId: 'avatar-penguin',
    points: 71,
    recentAwards: [
      { category: 'brave-explorer', timestamp: new Date() },
    ],
    badges: ['Bronze Badge', 'Silver Badge', 'Gold Badge'],
  },
  {
    id: 'student-6',
    name: 'Jack',
    avatarId: 'avatar-dragon',
    points: 15,
    recentAwards: [
      { category: 'great-listening', timestamp: new Date() },
    ],
    badges: ['Bronze Badge'],
  },
];

// Class total milestone for celebrations
const CLASS_MILESTONE = 200;

// Star burst celebration component
function CelebrationOverlay({
  show,
  milestone,
  studentName,
  onComplete,
}: {
  show: boolean;
  milestone: typeof MILESTONES[0] | null;
  studentName?: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show || !milestone) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        className="relative"
      >
        {/* Confetti burst */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos((i * 18 * Math.PI) / 180) * 200,
              y: Math.sin((i * 18 * Math.PI) / 180) * 200,
              scale: [0, 1, 0.5],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{ duration: 1.5, delay: i * 0.02 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl"
          >
            {['🌟', '⭐', '✨', '🎉', '🎊', milestone.emoji][i % 6]}
          </motion.div>
        ))}

        {/* Main celebration card */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.1, 1] }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-8xl mb-4"
          >
            {milestone.emoji}
          </motion.div>

          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            {studentName ? `${studentName} reached` : 'Milestone!'}
          </h2>
          <p className="text-xl text-gray-700 mb-4">{milestone.message}</p>

          {/* Reward badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full font-bold"
          >
            <Crown className="w-5 h-5" />
            {milestone.reward}
          </motion.div>

          {/* Star display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-2 mt-4"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.7 + star * 0.1 }}
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

// Student card component for class view
function StudentCard({
  student,
  isSelected,
  onSelect,
  onAward,
}: {
  student: Student;
  isSelected: boolean;
  onSelect: () => void;
  onAward: (category: string) => void;
}) {
  const avatar = getAvatar(student.avatarId);
  const nextMilestone = MILESTONES.find((m) => m.points > student.points);
  const progress = nextMilestone
    ? (student.points / nextMilestone.points) * 100
    : 100;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative rounded-3xl p-4 transition-all cursor-pointer",
        isSelected
          ? "bg-gradient-to-br from-purple-100 to-pink-100 ring-4 ring-purple-400 shadow-xl"
          : "bg-white shadow-md hover:shadow-lg"
      )}
    >
      {/* Avatar and name */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-gradient-to-br",
            avatar.bg
          )}
        >
          {avatar.emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg">{student.name}</h3>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-yellow-600">{student.points} points</span>
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Next: {nextMilestone.reward}</span>
            <span>{nextMilestone.points - student.points} to go</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex gap-1 mb-3">
        {student.badges.map((badge, index) => (
          <motion.span
            key={badge}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="px-2 py-0.5 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full text-xs font-medium text-amber-700"
          >
            {badge}
          </motion.span>
        ))}
      </div>

      {/* Quick award buttons (visible when selected) */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-purple-200"
          >
            <p className="text-sm text-gray-600 mb-2 text-center">Award a point:</p>
            <div className="flex justify-center gap-2 flex-wrap">
              {POINT_CATEGORIES.slice(0, 4).map((category) => (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAward(category.id);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md transition-transform",
                    `bg-gradient-to-br ${category.color}`
                  )}
                  style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
                  title={category.name}
                >
                  {category.icon}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent award indicator */}
      {student.recentAwards.length > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
      )}
    </motion.div>
  );
}

// Award interface component
function AwardInterface({
  selectedStudent,
  onAward,
  onCancel,
  speakMessage,
}: {
  selectedStudent: Student | null;
  onAward: (categoryId: string) => void;
  onCancel: () => void;
  speakMessage: (message: string) => void;
}) {
  if (!selectedStudent) return null;

  const avatar = getAvatar(selectedStudent.avatarId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl p-6 pb-8"
    >
      {/* Student info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
              avatar.bg
            )}
          >
            {avatar.emoji}
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Award {selectedStudent.name}</h3>
            <p className="text-sm text-gray-500">Tap a category to give points</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      {/* Award categories */}
      <div className="grid grid-cols-3 gap-3">
        {POINT_CATEGORIES.map((category) => {
          const IconComponent = category.lucideIcon;

          return (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                speakMessage(category.audio);
                onAward(category.id);
              }}
              className={cn(
                "relative rounded-2xl p-4 text-center transition-all shadow-md hover:shadow-lg",
                `bg-gradient-to-br ${category.color} text-white`
              )}
              style={{ minHeight: '100px' }}
            >
              <div className="text-4xl mb-2">{category.icon}</div>
              <h4 className="font-bold text-sm mb-1">{category.name}</h4>
              <div className="flex items-center justify-center gap-1 text-xs opacity-90">
                <Plus className="w-3 h-3" />
                <span>{category.points} point{category.points > 1 ? 's' : ''}</span>
              </div>

              {/* Audio button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakMessage(category.description);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-white/30 rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"
              >
                <Volume2 className="w-3 h-3" />
              </button>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// Class progress component
function ClassProgress({
  totalPoints,
  milestone,
}: {
  totalPoints: number;
  milestone: number;
}) {
  const progress = Math.min((totalPoints / milestone) * 100, 100);
  const isComplete = totalPoints >= milestone;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl p-4 mb-6",
        isComplete
          ? "bg-gradient-to-r from-yellow-400 to-amber-500"
          : "bg-gradient-to-r from-purple-500 to-pink-500"
      )}
    >
      <div className="flex items-center justify-between text-white mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <span className="font-bold">Class Goal</span>
        </div>
        <span className="font-bold text-lg">
          {totalPoints}/{milestone} points
        </span>
      </div>

      <div className="w-full h-4 bg-white/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-white rounded-full"
        />
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 mt-3 text-white"
        >
          <PartyPopper className="w-5 h-5" />
          <span className="font-bold">Class celebration unlocked!</span>
        </motion.div>
      )}

      {!isComplete && (
        <p className="text-white/80 text-sm mt-2 text-center">
          {milestone - totalPoints} more points for class reward!
        </p>
      )}
    </motion.div>
  );
}

// Leaderboard component
function Leaderboard({ students }: { students: Student[] }) {
  const sortedStudents = [...students].sort((a, b) => b.points - a.points);
  const topThree = sortedStudents.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-md mb-6"
    >
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        Top Explorers
      </h3>

      <div className="flex justify-center items-end gap-4 mb-4">
        {/* Second place */}
        {topThree[1] && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-2xl mb-1">🥈</div>
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br mx-auto mb-1",
                getAvatar(topThree[1].avatarId).bg
              )}
            >
              {getAvatar(topThree[1].avatarId).emoji}
            </div>
            <p className="text-sm font-medium text-gray-700">{topThree[1].name}</p>
            <p className="text-xs text-gray-500">{topThree[1].points} pts</p>
          </motion.div>
        )}

        {/* First place */}
        {topThree[0] && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center -mt-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-3xl mb-1"
            >
              👑
            </motion.div>
            <div
              className={cn(
                "w-18 h-18 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br mx-auto mb-1 ring-4 ring-yellow-400",
                getAvatar(topThree[0].avatarId).bg
              )}
              style={{ width: 72, height: 72 }}
            >
              {getAvatar(topThree[0].avatarId).emoji}
            </div>
            <p className="text-sm font-bold text-gray-800">{topThree[0].name}</p>
            <p className="text-sm font-bold text-yellow-600">{topThree[0].points} pts</p>
          </motion.div>
        )}

        {/* Third place */}
        {topThree[2] && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="text-2xl mb-1">🥉</div>
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br mx-auto mb-1",
                getAvatar(topThree[2].avatarId).bg
              )}
            >
              {getAvatar(topThree[2].avatarId).emoji}
            </div>
            <p className="text-sm font-medium text-gray-700">{topThree[2].name}</p>
            <p className="text-xs text-gray-500">{topThree[2].points} pts</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function ExplorerPointsPage() {
  const router = useRouter();
  const { activeChild } = useEarlyYearsStore();

  // State
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAwardInterface, setShowAwardInterface] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<typeof MILESTONES[0] | null>(null);
  const [celebrationStudentName, setCelebrationStudentName] = useState<string>('');
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [showTeacherPin, setShowTeacherPin] = useState(false);
  const [pin, setPin] = useState('');

  const totalClassPoints = students.reduce((acc, s) => acc + s.points, 0);

  // Text-to-speech
  const speakMessage = useCallback((message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleSelectStudent = (student: Student) => {
    if (isTeacherMode) {
      setSelectedStudent(student);
      setShowAwardInterface(true);
    }
  };

  const handleAwardPoint = (categoryId: string) => {
    if (!selectedStudent) return;

    const category = POINT_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;

    // Update student points
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id
          ? {
              ...s,
              points: s.points + category.points,
              recentAwards: [
                { category: categoryId, timestamp: new Date() },
                ...s.recentAwards.slice(0, 4),
              ],
            }
          : s
      )
    );

    // Check for milestone
    const newPoints = selectedStudent.points + category.points;
    const newMilestone = MILESTONES.find(
      (m) => m.points <= newPoints && m.points > selectedStudent.points
    );

    if (newMilestone) {
      setCelebrationMilestone(newMilestone);
      setCelebrationStudentName(selectedStudent.name);
      setShowCelebration(true);

      // Add badge
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id && !s.badges.includes(newMilestone.reward)
            ? { ...s, badges: [...s.badges, newMilestone.reward] }
            : s
        )
      );
    }

    // Close award interface
    setShowAwardInterface(false);
    setSelectedStudent(null);

    // Play celebration sound
    speakMessage(`${category.audio}`);
  };

  const handleTeacherPinEntry = (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      if (newPin === '1234') {
        setIsTeacherMode(true);
        setShowTeacherPin(false);
        speakMessage('Teacher mode activated');
      }
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-yellow-50">
      {/* Celebration overlay */}
      <AnimatePresence>
        <CelebrationOverlay
          show={showCelebration}
          milestone={celebrationMilestone}
          studentName={celebrationStudentName}
          onComplete={() => setShowCelebration(false)}
        />
      </AnimatePresence>

      {/* Teacher PIN modal */}
      <AnimatePresence>
        {showTeacherPin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowTeacherPin(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Teacher Mode</h2>
                <p className="text-gray-500 text-sm mt-1">Enter PIN to award points</p>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl font-bold",
                      pin.length > i
                        ? "border-purple-400 bg-purple-50 text-purple-600"
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    {pin.length > i ? '*' : ''}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === 'DEL') setPin(pin.slice(0, -1));
                      else if (key !== '') handleTeacherPinEntry(key);
                    }}
                    disabled={key === ''}
                    className={cn(
                      "h-12 rounded-xl font-bold text-lg",
                      key === '' ? "invisible" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    )}
                    style={{ minHeight: TOUCH_TARGET_SIZE }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/early-years')}
            className="flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors h-11 w-11"
            style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              🏆
            </motion.span>
            <span className="font-bold text-lg text-purple-600">Explorer Points</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Teacher mode toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (isTeacherMode) {
                  setIsTeacherMode(false);
                } else {
                  setShowTeacherPin(true);
                }
              }}
              className={cn(
                "flex items-center justify-center rounded-xl transition-colors h-11 w-11",
                isTeacherMode
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
              style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
            >
              {isTeacherMode ? (
                <Gift className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Class progress */}
          <ClassProgress totalPoints={totalClassPoints} milestone={CLASS_MILESTONE} />

          {/* Leaderboard */}
          <Leaderboard students={students} />

          {/* Mode indicator */}
          {isTeacherMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-100 rounded-xl p-3 mb-4 text-center"
            >
              <p className="text-green-700 font-medium flex items-center justify-center gap-2">
                <Gift className="w-5 h-5" />
                Teacher Mode: Tap a student to award points
              </p>
            </motion.div>
          )}

          {/* Students grid */}
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            All Explorers
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isSelected={selectedStudent?.id === student.id}
                onSelect={() => handleSelectStudent(student)}
                onAward={(categoryId) => {
                  setSelectedStudent(student);
                  handleAwardPoint(categoryId);
                }}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Award interface (teacher mode) */}
      <AnimatePresence>
        {showAwardInterface && isTeacherMode && (
          <AwardInterface
            selectedStudent={selectedStudent}
            onAward={handleAwardPoint}
            onCancel={() => {
              setShowAwardInterface(false);
              setSelectedStudent(null);
            }}
            speakMessage={speakMessage}
          />
        )}
      </AnimatePresence>

      {/* Decorative elements */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-24 z-0">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-4 left-[15%] text-3xl"
        >
          🌟
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          className="absolute bottom-6 right-[20%] text-3xl"
        >
          ⭐
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-2 left-[50%] text-2xl"
        >
          ✨
        </motion.div>
      </div>
    </div>
  );
}
