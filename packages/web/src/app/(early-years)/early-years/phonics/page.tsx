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

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Play,
  Pause,
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

// Design System v2.0: Minimum touch target size
const TOUCH_TARGET_SIZE = 44;

// Phonics activity types
type PhonicsActivityType = 'sound-intro' | 'sound-match' | 'blending' | 'word-read' | 'sentence';

// Grapheme data with pronunciation hints
interface GraphemeData {
  grapheme: string;
  phoneme: string; // IPA representation
  keywords: string[];
  emoji: string;
  audioHint: string;
  mouthPosition: string;
}

// Phase grapheme data
const GRAPHEME_DATA: Record<string, GraphemeData> = {
  s: { grapheme: 's', phoneme: '/s/', keywords: ['sun', 'snake', 'sock'], emoji: '🐍', audioHint: 'sssss like a snake', mouthPosition: 'teeth together' },
  a: { grapheme: 'a', phoneme: '/ae/', keywords: ['apple', 'ant', 'alligator'], emoji: '🍎', audioHint: 'a-a-a like biting an apple', mouthPosition: 'mouth open wide' },
  t: { grapheme: 't', phoneme: '/t/', keywords: ['tiger', 'tent', 'table'], emoji: '🐯', audioHint: 't-t-t tap your tongue', mouthPosition: 'tongue behind teeth' },
  p: { grapheme: 'p', phoneme: '/p/', keywords: ['pig', 'pen', 'panda'], emoji: '🐷', audioHint: 'p-p-p pop your lips', mouthPosition: 'lips together then pop' },
  i: { grapheme: 'i', phoneme: '/i/', keywords: ['igloo', 'insect', 'ink'], emoji: '🏠', audioHint: 'i-i-i it is sticky', mouthPosition: 'small smile' },
  n: { grapheme: 'n', phoneme: '/n/', keywords: ['nose', 'net', 'nut'], emoji: '👃', audioHint: 'nnnnn nose noise', mouthPosition: 'tongue on roof' },
  m: { grapheme: 'm', phoneme: '/m/', keywords: ['monkey', 'moon', 'mouse'], emoji: '🐵', audioHint: 'mmmm yummy food', mouthPosition: 'lips together' },
  d: { grapheme: 'd', phoneme: '/d/', keywords: ['dog', 'duck', 'door'], emoji: '🐕', audioHint: 'd-d-d like a drum', mouthPosition: 'tongue tap' },
  g: { grapheme: 'g', phoneme: '/g/', keywords: ['gorilla', 'gate', 'goat'], emoji: '🦍', audioHint: 'g-g-g gulping water', mouthPosition: 'back of throat' },
  o: { grapheme: 'o', phoneme: '/o/', keywords: ['orange', 'octopus', 'on'], emoji: '🍊', audioHint: 'o-o-o orange', mouthPosition: 'round mouth' },
  c: { grapheme: 'c', phoneme: '/k/', keywords: ['cat', 'cup', 'car'], emoji: '🐱', audioHint: 'c-c-c like a cat', mouthPosition: 'back of mouth' },
  k: { grapheme: 'k', phoneme: '/k/', keywords: ['kite', 'king', 'key'], emoji: '🪁', audioHint: 'k-k-k flying kite', mouthPosition: 'back of mouth' },
  ck: { grapheme: 'ck', phoneme: '/k/', keywords: ['duck', 'sock', 'clock'], emoji: '🦆', audioHint: 'ck at the end', mouthPosition: 'quick sound' },
  e: { grapheme: 'e', phoneme: '/e/', keywords: ['elephant', 'egg', 'elbow'], emoji: '🐘', audioHint: 'e-e-e elephant', mouthPosition: 'mouth slightly open' },
  u: { grapheme: 'u', phoneme: '/u/', keywords: ['umbrella', 'up', 'under'], emoji: '☂️', audioHint: 'u-u-u under umbrella', mouthPosition: 'lips rounded' },
  r: { grapheme: 'r', phoneme: '/r/', keywords: ['rabbit', 'rain', 'robot'], emoji: '🐰', audioHint: 'rrrrr like a robot', mouthPosition: 'tongue curled' },
  h: { grapheme: 'h', phoneme: '/h/', keywords: ['hat', 'house', 'horse'], emoji: '🎩', audioHint: 'h-h-h hot breath', mouthPosition: 'breathe out' },
  b: { grapheme: 'b', phoneme: '/b/', keywords: ['ball', 'bear', 'bee'], emoji: '🐻', audioHint: 'b-b-b bouncing ball', mouthPosition: 'lips together then release' },
  f: { grapheme: 'f', phoneme: '/f/', keywords: ['fish', 'fox', 'frog'], emoji: '🐟', audioHint: 'ffff like blowing', mouthPosition: 'teeth on lip' },
  // Phase 3 digraphs
  ch: { grapheme: 'ch', phoneme: '/tʃ/', keywords: ['cheese', 'chick', 'chair'], emoji: '🧀', audioHint: 'ch-ch-ch choo choo train', mouthPosition: 'lips pushed out' },
  sh: { grapheme: 'sh', phoneme: '/ʃ/', keywords: ['sheep', 'ship', 'shell'], emoji: '🐑', audioHint: 'shhhh be quiet', mouthPosition: 'finger on lips' },
  th: { grapheme: 'th', phoneme: '/θ/', keywords: ['thumb', 'three', 'think'], emoji: '👍', audioHint: 'th tongue out', mouthPosition: 'tongue between teeth' },
  ng: { grapheme: 'ng', phoneme: '/ŋ/', keywords: ['ring', 'king', 'sing'], emoji: '💍', audioHint: 'ng sing along', mouthPosition: 'back of throat' },
  ai: { grapheme: 'ai', phoneme: '/eɪ/', keywords: ['rain', 'train', 'snail'], emoji: '🌧️', audioHint: 'ai say your name', mouthPosition: 'mouth changes shape' },
  ee: { grapheme: 'ee', phoneme: '/iː/', keywords: ['tree', 'bee', 'see'], emoji: '🌳', audioHint: 'ee like a squeaky door', mouthPosition: 'big smile' },
  igh: { grapheme: 'igh', phoneme: '/aɪ/', keywords: ['light', 'night', 'high'], emoji: '💡', audioHint: 'igh fly high', mouthPosition: 'mouth opens then closes' },
  oa: { grapheme: 'oa', phoneme: '/əʊ/', keywords: ['boat', 'coat', 'goat'], emoji: '⛵', audioHint: 'oa oh no', mouthPosition: 'lips round then spread' },
  oo: { grapheme: 'oo', phoneme: '/uː/', keywords: ['moon', 'spoon', 'zoo'], emoji: '🌙', audioHint: 'oo moo like a cow', mouthPosition: 'small round mouth' },
};

// Demo CVC words for blending practice
const CVC_WORDS = [
  { word: 'sat', sounds: ['s', 'a', 't'], emoji: '🪑' },
  { word: 'pin', sounds: ['p', 'i', 'n'], emoji: '📍' },
  { word: 'dog', sounds: ['d', 'o', 'g'], emoji: '🐕' },
  { word: 'cat', sounds: ['c', 'a', 't'], emoji: '🐱' },
  { word: 'sun', sounds: ['s', 'u', 'n'], emoji: '☀️' },
  { word: 'map', sounds: ['m', 'a', 'p'], emoji: '🗺️' },
  { word: 'hat', sounds: ['h', 'a', 't'], emoji: '🎩' },
  { word: 'pen', sounds: ['p', 'e', 'n'], emoji: '🖊️' },
  { word: 'bed', sounds: ['b', 'e', 'd'], emoji: '🛏️' },
  { word: 'red', sounds: ['r', 'e', 'd'], emoji: '🔴' },
];

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

// Voice coach encouragement messages that cycle for variety
const COACH_ENCOURAGEMENTS = [
  "Great job! Let's try another word!",
  "You're doing amazing! Here's the next one!",
  "Wonderful! Ready for another word?",
  "Fantastic blending! Keep going!",
  "Super work! Here comes the next word!",
  "Brilliant! You're a blending star!",
  "Excellent! Let's keep practising!",
  "Well done! You're getting so good at this!",
];

// Blending practice activity component
function BlendingActivity({
  word,
  wordIndex,
  onComplete,
  onSpeak,
}: {
  word: typeof CVC_WORDS[0];
  wordIndex: number;
  onComplete: (success: boolean) => void;
  onSpeak: (text: string) => void;
}) {
  const [revealedSounds, setRevealedSounds] = useState<number[]>([]);
  const [isBlending, setIsBlending] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const [showCoach, setShowCoach] = useState(false);

  // Voice coach introduces each word when the component mounts or word changes
  useEffect(() => {
    setRevealedSounds([]);
    setIsBlending(false);
    setShowWord(false);
    setShowCoach(true);

    const soundsList = word.sounds.join(', ');
    const introMessage = wordIndex === 0
      ? `Let's blend some sounds together! Our first word has the sounds ${soundsList}. Tap each sound to hear it!`
      : `${COACH_ENCOURAGEMENTS[wordIndex % COACH_ENCOURAGEMENTS.length]} This word has the sounds ${soundsList}. Tap each sound!`;

    setCoachMessage(introMessage);
    onSpeak(introMessage);

    const timer = setTimeout(() => setShowCoach(false), 4000);
    return () => clearTimeout(timer);
  }, [word.word]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRevealSound = (index: number) => {
    if (!revealedSounds.includes(index)) {
      const newRevealed = [...revealedSounds, index];
      setRevealedSounds(newRevealed);
      onSpeak(word.sounds[index]);

      // When all sounds revealed, encourage blending
      if (newRevealed.length === word.sounds.length) {
        setTimeout(() => {
          const blendPrompt = `Now press the button to blend ${word.sounds.join(' ')} together!`;
          setCoachMessage(blendPrompt);
          setShowCoach(true);
          onSpeak(blendPrompt);
          setTimeout(() => setShowCoach(false), 3000);
        }, 800);
      }
    }
  };

  const handleBlend = () => {
    setIsBlending(true);
    setShowCoach(false);

    // Speak sounds slowly then blend
    word.sounds.forEach((sound, i) => {
      setTimeout(() => onSpeak(sound), i * 600);
    });

    setTimeout(() => {
      onSpeak(word.word);
      setShowWord(true);
      // Celebrate
      setTimeout(() => {
        const celebration = `${word.word}! That spells ${word.word}! Well done!`;
        setCoachMessage(celebration);
        setShowCoach(true);
        onSpeak(celebration);
      }, 600);
    }, word.sounds.length * 600 + 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto text-center"
    >
      {/* Voice coach bubble */}
      <AnimatePresence>
        {showCoach && coachMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="mb-4 mx-auto max-w-sm"
          >
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border-2 border-purple-200">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl shrink-0">🧑‍🏫</span>
                <p className="text-sm text-gray-700 font-medium leading-relaxed">{coachMessage}</p>
              </div>
              <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white/90 border-b-2 border-r-2 border-purple-200 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <h3 className="text-xl font-bold text-gray-800 mb-6">
        Tap each sound, then blend them together!
      </h3>

      {/* Sound boxes */}
      <div className="flex justify-center gap-3 mb-8">
        {word.sounds.map((sound, index) => (
          <motion.button
            key={`${word.word}-${index}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleRevealSound(index)}
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center",
              "font-bold text-3xl transition-all shadow-lg",
              revealedSounds.includes(index)
                ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                : "bg-white border-4 border-purple-300 text-purple-600"
            )}
            style={{ minWidth: TOUCH_TARGET_SIZE, minHeight: TOUCH_TARGET_SIZE }}
          >
            {revealedSounds.includes(index) ? sound : '?'}
          </motion.button>
        ))}
      </div>

      {/* Blend button */}
      {revealedSounds.length === word.sounds.length && !showWord && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBlend}
            disabled={isBlending}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-lg shadow-lg"
            style={{ minHeight: TOUCH_TARGET_SIZE }}
          >
            {isBlending ? 'Blending...' : 'Blend the Sounds!'}
          </motion.button>
        </motion.div>
      )}

      {/* Word reveal */}
      {showWord && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="mt-6"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-6xl">{word.emoji}</span>
            <span className="text-5xl font-bold text-purple-600">{word.word}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onComplete(true)}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg"
            style={{ minHeight: TOUCH_TARGET_SIZE }}
          >
            Well Done! Next Word
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
  const [starsEarned, setStarsEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

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

    if (currentWordIndex < CVC_WORDS.length - 1) {
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
        {activityType === 'blending' && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-4">
              <span className="text-sm text-gray-700 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full">
                Word {currentWordIndex + 1} of {CVC_WORDS.length}
              </span>
            </div>
            <BlendingActivity
              word={CVC_WORDS[currentWordIndex]}
              wordIndex={currentWordIndex}
              onComplete={handleBlendingComplete}
              onSpeak={speakMessage}
            />
          </div>
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
