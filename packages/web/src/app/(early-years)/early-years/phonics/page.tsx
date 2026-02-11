'use client';

/**
 * Phonics Engine Page (Little Explorers)
 * UI/UX Design System v2.0 Compliant
 *
 * Features:
 * - 6-Phase Structure: Letter sounds -> Blending -> Digraphs -> Complex
 * - Sound matching, blending practice, decodable reading activities
 * - Clear phoneme articulation audio
 * - Pronunciation scoring with visual cues
 * - Collectible letter badges rewards
 * - Parent view for phoneme mastery progress
 *
 * SSP (Systematic Synthetic Phonics) implementation following UK curriculum
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Star,
  Award,
  Lock,
  ChevronRight,
  Check,
  X,
  Mic,
  BookOpen,
  Sparkles,
  Trophy,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { PHONICS_PHASES, type PhonicsPhase } from '@/types/early-years';
import {
  BlendingActivity,
  GRAPHEME_DATA,
  BLENDING_WORDS,
  type BlendingMode,
} from '@/components/early-years/blending';

// Design System v2.0: Minimum touch target size
const TOUCH_TARGET_SIZE = 44;

// Phonics activity types
type PhonicsActivityType = 'sound-intro' | 'sound-match' | 'blending' | 'word-read' | 'sentence';


// Collectible letter badge component
function LetterBadge({
  grapheme,
  isUnlocked,
  isMastered,
  onClick,
}: {
  grapheme: string;
  isUnlocked: boolean;
  isMastered: boolean;
  onClick: () => void;
}) {
  const data = GRAPHEME_DATA[grapheme.toLowerCase()];

  return (
    <motion.button
      whileHover={isUnlocked ? { scale: 1.1 } : {}}
      whileTap={isUnlocked ? { scale: 0.95 } : {}}
      onClick={isUnlocked ? onClick : undefined}
      className={cn(
        "relative w-16 h-16 rounded-2xl flex items-center justify-center",
        "font-bold text-2xl transition-all shadow-md",
        isUnlocked
          ? isMastered
            ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
            : "bg-gradient-to-br from-purple-400 to-pink-500 text-white hover:shadow-lg"
          : "bg-gray-200 text-gray-400 cursor-not-allowed"
      )}
      style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
    >
      {grapheme.toUpperCase()}

      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-300/50 rounded-2xl">
          <Lock className="w-5 h-5 text-gray-500" />
        </div>
      )}

      {isMastered && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {data && isUnlocked && (
        <span className="absolute -bottom-1 text-lg">{data.emoji}</span>
      )}
    </motion.button>
  );
}

// Sound introduction activity component
function SoundIntroActivity({
  grapheme,
  onComplete,
  onSpeak,
}: {
  grapheme: string;
  onComplete: () => void;
  onSpeak: (text: string) => void;
}) {
  const data = GRAPHEME_DATA[grapheme.toLowerCase()];
  const [step, setStep] = useState<'intro' | 'practice' | 'done'>('intro');
  const [practiceCount, setPracticeCount] = useState(0);

  if (!data) return null;

  const handleListen = () => {
    onSpeak(`${grapheme}. ${data.audioHint}. ${grapheme} is for ${data.keywords[0]}`);
  };

  const handlePractice = () => {
    setPracticeCount((prev) => prev + 1);
    onSpeak(grapheme);

    if (practiceCount >= 2) {
      setStep('done');
    } else {
      setStep('practice');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto text-center"
    >
      {step === 'intro' && (
        <>
          {/* Large letter display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="mb-8"
          >
            <div className="w-48 h-48 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <span className="text-9xl font-bold text-white">{grapheme}</span>
            </div>
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-6xl block mt-4"
            >
              {data.emoji}
            </motion.span>
          </motion.div>

          {/* Audio hint */}
          <p className="text-xl text-gray-600 mb-6">"{data.audioHint}"</p>

          {/* Mouth position guide */}
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-blue-800 font-medium">
              Mouth position: <span className="font-bold">{data.mouthPosition}</span>
            </p>
          </div>

          {/* Keywords */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {data.keywords.map((keyword) => (
              <motion.button
                key={keyword}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSpeak(`${grapheme} is for ${keyword}`)}
                className="px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
              >
                <span className="font-semibold text-gray-700 capitalize">{keyword}</span>
              </motion.button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleListen}
              className="flex items-center gap-2 px-6 py-4 bg-blue-500 text-white rounded-2xl font-bold shadow-lg"
              style={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              <Volume2 className="w-6 h-6" />
              Listen Again
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePractice}
              className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg"
              style={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              <Mic className="w-6 h-6" />
              Say It!
            </motion.button>
          </div>
        </>
      )}

      {step === 'practice' && (
        <>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Mic className="w-16 h-16 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Great job! Say it again!</h3>
            <p className="text-lg text-gray-600 mb-6">
              "{data.audioHint}"
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full",
                    i <= practiceCount ? "bg-green-500" : "bg-gray-300"
                  )}
                />
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePractice}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg"
              style={{ minHeight: TOUCH_TARGET_SIZE }}
            >
              Say "{grapheme}" Again!
            </motion.button>
          </motion.div>
        </>
      )}

      {step === 'done' && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-8xl mb-6"
          >
            🌟
          </motion.div>
          <h3 className="text-3xl font-bold text-purple-600 mb-4">Amazing!</h3>
          <p className="text-xl text-gray-600 mb-6">
            You learned the "{grapheme}" sound!
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onComplete}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg"
            style={{ minHeight: TOUCH_TARGET_SIZE }}
          >
            Collect Your Badge!
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}


// Phase selector component
function PhaseSelector({
  phases,
  currentPhase,
  unlockedPhases,
  onSelectPhase,
}: {
  phases: PhonicsPhase[];
  currentPhase: number;
  unlockedPhases: number[];
  onSelectPhase: (phase: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {phases.map((phase) => {
        const isUnlocked = unlockedPhases.includes(phase.phase);
        const isCurrent = currentPhase === phase.phase;

        return (
          <motion.button
            key={phase.phase}
            whileHover={isUnlocked ? { scale: 1.02 } : {}}
            whileTap={isUnlocked ? { scale: 0.98 } : {}}
            onClick={() => isUnlocked && onSelectPhase(phase.phase)}
            className={cn(
              "relative rounded-3xl p-4 text-left transition-all overflow-hidden",
              isUnlocked
                ? isCurrent
                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl ring-4 ring-purple-300"
                  : "bg-white hover:shadow-lg shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {/* Phase number */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2",
                isCurrent ? "bg-white/20 text-white" : isUnlocked ? "bg-purple-100 text-purple-600" : "bg-gray-200"
              )}
            >
              {phase.phase}
            </div>

            <h3 className={cn(
              "font-bold text-lg mb-1",
              isCurrent ? "text-white" : isUnlocked ? "text-gray-800" : "text-gray-400"
            )}>
              {phase.name}
            </h3>

            <p className={cn(
              "text-sm line-clamp-2",
              isCurrent ? "text-white/80" : isUnlocked ? "text-gray-500" : "text-gray-400"
            )}>
              {phase.description}
            </p>

            {/* Lock overlay */}
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50">
                <div className="bg-white rounded-full p-3 shadow">
                  <Lock className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {isUnlocked && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Award className={cn("w-4 h-4", isCurrent ? "text-white" : "text-yellow-500")} />
                  <span className={isCurrent ? "text-white/80" : "text-gray-500"}>
                    {phase.graphemes.length} sounds
                  </span>
                </div>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// Parent progress view component
function ParentProgressView({
  masteredGraphemes,
  inProgressGraphemes,
  totalGraphemes,
  accuracy,
  onClose,
}: {
  masteredGraphemes: string[];
  inProgressGraphemes: string[];
  totalGraphemes: number;
  accuracy: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Phonics Progress</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Overall progress */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Overall Progress</span>
            <span className="font-bold text-purple-600">
              {masteredGraphemes.length}/{totalGraphemes}
            </span>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
              style={{ width: `${(masteredGraphemes.length / totalGraphemes) * 100}%` }}
            />
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-green-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Accuracy Rate</span>
            <span className="font-bold text-green-600">{accuracy}%</span>
          </div>
        </div>

        {/* Mastered sounds */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Mastered Sounds ({masteredGraphemes.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {masteredGraphemes.map((g) => (
              <span
                key={g}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold"
              >
                {g}
              </span>
            ))}
            {masteredGraphemes.length === 0 && (
              <span className="text-gray-400">None yet</span>
            )}
          </div>
        </div>

        {/* In progress */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Learning Now ({inProgressGraphemes.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {inProgressGraphemes.map((g) => (
              <span
                key={g}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold"
              >
                {g}
              </span>
            ))}
            {inProgressGraphemes.length === 0 && (
              <span className="text-gray-400">None yet</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function PhonicsEnginePage() {
  const router = useRouter();
  const { childDashboard, activeChild } = useEarlyYearsStore();

  // State
  const [selectedPhase, setSelectedPhase] = useState<number>(2);
  const [selectedGrapheme, setSelectedGrapheme] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<PhonicsActivityType | null>(null);
  const [masteredGraphemes, setMasteredGraphemes] = useState<string[]>(['s', 'a', 't', 'p']);
  const [inProgressGraphemes, setInProgressGraphemes] = useState<string[]>(['i', 'n']);
  const [showParentView, setShowParentView] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [blendingMode] = useState<BlendingMode>('successive');
  const [starsEarned, setStarsEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Get Phase 2 words for blending (beginner CVC words)
  const blendingWords = BLENDING_WORDS.filter((w) => w.phase === 2);

  // Use progress from dashboard if available
  useEffect(() => {
    if (childDashboard?.phonicsProgress) {
      setMasteredGraphemes(childDashboard.phonicsProgress.graphemesLearned);
      setInProgressGraphemes(childDashboard.phonicsProgress.graphemesInProgress);
      setSelectedPhase(childDashboard.phonicsProgress.currentPhase);
    }
  }, [childDashboard]);

  // Unlocked phases based on progress
  const unlockedPhases = [1, 2]; // Demo: phases 1 and 2 unlocked
  const currentPhaseData = PHONICS_PHASES.find((p) => p.phase === selectedPhase);

  // Text-to-speech
  const speakMessage = useCallback((message: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleGraphemeSelect = (grapheme: string) => {
    setSelectedGrapheme(grapheme);
    setActivityType('sound-intro');
    speakMessage(`Let's learn the ${grapheme} sound!`);
  };

  const handleSoundComplete = () => {
    if (selectedGrapheme) {
      // Mark as learned
      if (!masteredGraphemes.includes(selectedGrapheme)) {
        setMasteredGraphemes([...masteredGraphemes, selectedGrapheme]);
        setInProgressGraphemes(inProgressGraphemes.filter((g) => g !== selectedGrapheme));
      }

      setStarsEarned((prev) => prev + 1);
      setShowCelebration(true);

      setTimeout(() => {
        setShowCelebration(false);
        setSelectedGrapheme(null);
        setActivityType(null);
      }, 2000);
    }
  };

  const handleStartBlending = () => {
    setActivityType('blending');
    setCurrentWordIndex(0);
    // Voice coach intro now handled by BlendingActivity component
  };

  const handleBlendingComplete = (success: boolean) => {
    if (success) {
      setStarsEarned((prev) => prev + 1);
    }

    if (currentWordIndex < blendingWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
    } else {
      // Finished all words
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setActivityType(null);
      }, 2000);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/images/mati-phonics-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'bottom center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#d8c9e8',
      }}
    >
      {/* Semi-transparent overlay so UI elements remain visible */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-100/40 via-transparent to-green-100/30 pointer-events-none" />
      {/* Parent progress modal */}
      <AnimatePresence>
        {showParentView && (
          <ParentProgressView
            masteredGraphemes={masteredGraphemes}
            inProgressGraphemes={inProgressGraphemes}
            totalGraphemes={PHONICS_PHASES.slice(0, 3).reduce((acc, p) => acc + p.graphemes.length, 0)}
            accuracy={childDashboard?.phonicsProgress?.accuracy || 75}
            onClose={() => setShowParentView(false)}
          />
        )}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              className="bg-white rounded-3xl p-8 text-center shadow-2xl"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-7xl mb-4"
              >
                🏆
              </motion.div>
              <h2 className="text-2xl font-bold text-purple-600">Fantastic!</h2>
              <div className="flex justify-center gap-2 mt-4">
                {[1, 2, 3].map((i) => (
                  <Star key={i} className="w-8 h-8 text-yellow-400 fill-yellow-400" />
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
            onClick={() => {
              if (activityType) {
                setActivityType(null);
                setSelectedGrapheme(null);
              } else {
                router.push('/early-years');
              }
            }}
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
              🌲
            </motion.span>
            <span className="font-bold text-lg text-emerald-600">Phonics Forest</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Stars earned */}
            <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-yellow-700">{starsEarned}</span>
            </div>

            {/* Parent view button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowParentView(true)}
              className="flex items-center justify-center rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors h-11 w-11"
              style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
            >
              <Lock className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 pt-20 pb-8 px-4 min-h-screen">
        {/* No activity selected - Show phase and grapheme selection */}
        {!activityType && (
          <>
            {/* Phase selector */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto mb-8"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Choose Your Phase
              </h2>
              <PhaseSelector
                phases={PHONICS_PHASES}
                currentPhase={selectedPhase}
                unlockedPhases={unlockedPhases}
                onSelectPhase={setSelectedPhase}
              />
            </motion.section>

            {/* Grapheme badges for selected phase */}
            {currentPhaseData && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-4xl mx-auto mb-8"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
                  Phase {selectedPhase}: {currentPhaseData.name}
                </h2>
                <p className="text-center text-gray-600 mb-6">
                  Tap a letter to learn its sound!
                </p>

                <div className="flex justify-center gap-3 flex-wrap">
                  {currentPhaseData.graphemes.map((grapheme) => {
                    const isUnlocked = masteredGraphemes.includes(grapheme) ||
                                       inProgressGraphemes.includes(grapheme) ||
                                       inProgressGraphemes.length < 3;
                    const isMastered = masteredGraphemes.includes(grapheme);

                    return (
                      <LetterBadge
                        key={grapheme}
                        grapheme={grapheme}
                        isUnlocked={isUnlocked}
                        isMastered={isMastered}
                        onClick={() => handleGraphemeSelect(grapheme)}
                      />
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Blending practice button */}
            {masteredGraphemes.length >= 3 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-md mx-auto text-center"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartBlending}
                  className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3"
                  style={{ minHeight: TOUCH_TARGET_SIZE }}
                >
                  <Sparkles className="w-6 h-6" />
                  Practice Blending!
                </motion.button>
              </motion.section>
            )}
          </>
        )}

        {/* Sound introduction activity */}
        {activityType === 'sound-intro' && selectedGrapheme && (
          <SoundIntroActivity
            grapheme={selectedGrapheme}
            onComplete={handleSoundComplete}
            onSpeak={speakMessage}
          />
        )}

        {/* Blending activity */}
        {activityType === 'blending' && blendingWords[currentWordIndex] && (
          <BlendingActivity
            word={blendingWords[currentWordIndex]}
            wordIndex={currentWordIndex}
            totalWords={blendingWords.length}
            blendingMode={blendingMode}
            onComplete={handleBlendingComplete}
            onSpeak={speakMessage}
          />
        )}
      </main>

      {/* Decorative elements */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-32 z-0">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute bottom-4 left-[10%] text-4xl"
        >
          🌲
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
          className="absolute bottom-2 left-[30%] text-3xl"
        >
          🌳
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0], x: [0, 5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute bottom-6 right-[20%] text-2xl"
        >
          🦉
        </motion.div>
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-0 right-[40%] text-3xl"
        >
          🍄
        </motion.div>
      </div>
    </div>
  );
}
