'use client';

/**
 * Learning Session Page
 * Interactive learning activities with mentor guidance
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  Star,
  Heart,
  Pause,
  Play,
  Home,
  ArrowRight,
  Check,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { earlyYearsApi } from '@/lib/early-years-api';
import { LEARNING_WORLDS, MENTORS, PHONICS_PHASES } from '@/types/early-years';

// Activity types for phonics
interface PhonicsActivity {
  type: 'letter_sound' | 'blend_words' | 'match_picture';
  letter?: string;
  word?: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
}

// Activity types for numeracy
interface NumeracyActivity {
  type: 'count_objects' | 'number_recognition' | 'simple_addition';
  question: string;
  options: string[];
  correctAnswer: string;
  visualCount?: number;
  hint?: string;
}

type Activity = PhonicsActivity | NumeracyActivity;

// Generate demo activities based on world
function generateActivities(world: string, phase: number): Activity[] {
  if (world === 'phonics_forest') {
    const phaseData = PHONICS_PHASES[phase - 1] || PHONICS_PHASES[1];
    const letters = phaseData.graphemes.slice(0, 6);

    return [
      {
        type: 'letter_sound',
        letter: letters[0] || 's',
        options: ['🐍', '🐱', '🐶', '🐸'],
        correctAnswer: '🐍',
        hint: 'This animal makes a hissing sound!',
      },
      {
        type: 'letter_sound',
        letter: letters[1] || 'a',
        options: ['🍎', '🍌', '🍇', '🍊'],
        correctAnswer: '🍎',
        hint: 'This fruit is red and crunchy!',
      },
      {
        type: 'match_picture',
        word: 'cat',
        options: ['🐱', '🐶', '🐰', '🐻'],
        correctAnswer: '🐱',
        hint: 'This pet says meow!',
      },
      {
        type: 'blend_words',
        word: 's-a-t',
        options: ['sat', 'cat', 'mat', 'bat'],
        correctAnswer: 'sat',
        hint: 'Put the sounds together: sss-aaa-t',
      },
      {
        type: 'letter_sound',
        letter: letters[2] || 't',
        options: ['🌳', '🌸', '🌻', '🍀'],
        correctAnswer: '🌳',
        hint: 'This is tall and has leaves!',
      },
    ];
  }

  // Number Land activities
  return [
    {
      type: 'count_objects',
      question: 'How many apples are there?',
      visualCount: 3,
      options: ['2', '3', '4', '5'],
      correctAnswer: '3',
      hint: 'Count each apple: 1, 2, 3...',
    },
    {
      type: 'number_recognition',
      question: 'Which number is this? 5',
      options: ['3', '4', '5', '6'],
      correctAnswer: '5',
      hint: 'Count on your fingers!',
    },
    {
      type: 'simple_addition',
      question: '2 + 1 = ?',
      options: ['2', '3', '4', '5'],
      correctAnswer: '3',
      hint: 'Start with 2 and add 1 more!',
    },
    {
      type: 'count_objects',
      question: 'How many stars?',
      visualCount: 5,
      options: ['3', '4', '5', '6'],
      correctAnswer: '5',
      hint: 'Touch each star as you count!',
    },
    {
      type: 'number_recognition',
      question: 'What comes after 3?',
      options: ['2', '3', '4', '5'],
      correctAnswer: '4',
      hint: '1, 2, 3, ...',
    },
  ];
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { currentSession, activeChild, endSession } = useEarlyYearsStore();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const world = currentSession?.world || 'phonics_forest';
  const mentor = currentSession?.mentor || 'ollie_owl';
  const worldInfo = LEARNING_WORLDS.find((w) => w.id === world)!;
  const mentorInfo = MENTORS.find((m) => m.id === mentor)!;

  // Generate activities on mount
  useEffect(() => {
    const generatedActivities = generateActivities(world, 2);
    setActivities(generatedActivities);
  }, [world]);

  const currentActivity = activities[currentActivityIndex];
  const progress = activities.length > 0 ? ((currentActivityIndex) / activities.length) * 100 : 0;

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    setAttempts((prev) => prev + 1);

    const correct = answer === currentActivity?.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      const earnedStars = hintsUsed > 0 ? 1 : attempts === 0 ? 3 : 2;
      setStarsEarned((prev) => prev + earnedStars);
      speakText(getMentorPraise());

      // Record activity
      if (currentSession) {
        await earlyYearsApi.recordActivity(currentSession.id, {
          activityType: currentActivity.type,
          score: earnedStars / 3,
          durationSeconds: 30, // Simplified for demo
          attempts: attempts + 1,
          hintsUsed,
        });
      }
    } else {
      speakText('Oops! Try again!');
    }
  };

  const getMentorPraise = (): string => {
    const praises = {
      ollie_owl: ['Whoo-hoo! Amazing!', 'Wise choice!', 'You\'re so clever!'],
      penny_penguin: ['Waddle-ful!', 'Ice-credible!', 'You\'re cool!'],
      leo_lion: ['ROAR-some!', 'You\'re brave!', 'Lion-tastic!'],
      bella_butterfly: ['Beautiful work!', 'You\'re flying high!', 'Magical!'],
    };
    const mentorPraises = praises[mentor as keyof typeof praises] || praises.ollie_owl;
    return mentorPraises[Math.floor(Math.random() * mentorPraises.length)];
  };

  const handleNext = () => {
    if (currentActivityIndex < activities.length - 1) {
      setCurrentActivityIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowHint(false);
      setHintsUsed(0);
      setAttempts(0);
    } else {
      setSessionComplete(true);
    }
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleEndSession = async () => {
    await endSession();
    router.push('/early-years');
  };

  const handleShowHint = () => {
    setShowHint(true);
    setHintsUsed((prev) => prev + 1);
    if (currentActivity?.hint) {
      speakText(currentActivity.hint);
    }
  };

  // Session complete screen
  if (sessionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 via-pink-100 to-yellow-100">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="text-8xl mb-6"
          >
            🎉
          </motion.div>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Amazing Job!</h1>
          <p className="text-xl text-gray-600 mb-6">
            You completed all the activities!
          </p>

          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              {[...Array(starsEarned)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Star className="w-10 h-10 text-yellow-500 fill-yellow-500" />
                </motion.div>
              ))}
            </div>
            <p className="text-2xl font-bold text-amber-800">
              {starsEarned} Stars Earned!
            </p>
          </div>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleEndSession}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xl font-bold"
            >
              Finish
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pause overlay
  if (isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900/90">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
        >
          <Pause className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Paused</h2>
          <div className="space-y-3">
            <button
              onClick={() => setIsPaused(false)}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Continue
            </button>
            <button
              onClick={() => setShowEndDialog(true)}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Exit Session
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!currentActivity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading activities...</p>
        </div>
      </div>
    );
  }

  // Get mentor emoji
  const mentorEmoji = {
    ollie_owl: '🦉',
    penny_penguin: '🐧',
    leo_lion: '🦁',
    bella_butterfly: '🦋',
  }[mentor] || '🦉';

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-b',
        worldInfo.bgGradient.replace('from-', 'from-').replace('to-', 'via-') + ' to-white'
      )}
    >
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{worldInfo.icon}</span>
            <div>
              <h1 className="font-bold text-gray-800">{worldInfo.name}</h1>
              <div className="text-sm text-gray-500">
                Activity {currentActivityIndex + 1} of {activities.length}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stars Counter */}
            <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-yellow-700">{starsEarned}</span>
            </div>

            {/* Pause Button */}
            <button
              onClick={() => setIsPaused(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Pause className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2 rounded-none" />
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Mentor Speech Bubble */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative bg-white rounded-3xl shadow-lg p-6 mb-8"
        >
          {/* Mentor Avatar */}
          <div className="absolute -top-6 -left-2 w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-4xl">
            {mentorEmoji}
          </div>

          <div className="ml-12">
            <p className="text-xl font-medium text-gray-800">
              {currentActivity.type === 'letter_sound' && (
                <>
                  What sound does the letter{' '}
                  <span className="text-3xl font-bold text-purple-600">
                    {(currentActivity as PhonicsActivity).letter}
                  </span>{' '}
                  make?
                </>
              )}
              {currentActivity.type === 'blend_words' && (
                <>
                  Blend these sounds:{' '}
                  <span className="text-2xl font-bold text-purple-600">
                    {(currentActivity as PhonicsActivity).word}
                  </span>
                </>
              )}
              {currentActivity.type === 'match_picture' && (
                <>
                  Find the picture that matches:{' '}
                  <span className="text-2xl font-bold text-purple-600">
                    {(currentActivity as PhonicsActivity).word}
                  </span>
                </>
              )}
              {currentActivity.type === 'count_objects' && (
                <>{(currentActivity as NumeracyActivity).question}</>
              )}
              {currentActivity.type === 'number_recognition' && (
                <>{(currentActivity as NumeracyActivity).question}</>
              )}
              {currentActivity.type === 'simple_addition' && (
                <>
                  Solve:{' '}
                  <span className="text-2xl font-bold text-blue-600">
                    {(currentActivity as NumeracyActivity).question}
                  </span>
                </>
              )}
            </p>

            <button
              onClick={() => speakText(currentActivity.type === 'letter_sound'
                ? `What sound does the letter ${(currentActivity as PhonicsActivity).letter} make?`
                : (currentActivity as NumeracyActivity).question || '')}
              className="mt-2 flex items-center gap-1 text-purple-600 hover:text-purple-700"
            >
              <Volume2 className="w-5 h-5" />
              <span className="text-sm">Listen again</span>
            </button>
          </div>
        </motion.div>

        {/* Visual for counting activities */}
        {currentActivity.type === 'count_objects' && (currentActivity as NumeracyActivity).visualCount && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex justify-center gap-3 mb-8"
          >
            {[...Array((currentActivity as NumeracyActivity).visualCount)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="text-5xl"
              >
                {currentActivity.question.includes('apple') ? '🍎' : '⭐'}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Answer Options */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {currentActivity.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === currentActivity.correctAnswer;
            const showResult = selectedAnswer !== null;

            return (
              <motion.button
                key={index}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={!showResult ? { scale: 1.05 } : {}}
                whileTap={!showResult ? { scale: 0.95 } : {}}
                onClick={() => handleAnswer(option)}
                disabled={showResult}
                className={cn(
                  'py-8 rounded-2xl text-4xl font-bold transition-all',
                  'border-4 shadow-lg',
                  showResult && isCorrectAnswer
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : showResult && isSelected && !isCorrectAnswer
                    ? 'bg-red-100 border-red-500 text-red-700'
                    : isSelected
                    ? 'bg-purple-100 border-purple-500'
                    : 'bg-white border-gray-200 hover:border-purple-300'
                )}
              >
                {option}
                {showResult && isCorrectAnswer && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-2"
                  >
                    <Check className="w-8 h-8 inline text-green-500" />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Hint */}
        <AnimatePresence>
          {showHint && currentActivity.hint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3"
            >
              <Lightbulb className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800">{currentActivity.hint}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {selectedAnswer === null && !showHint && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShowHint}
              className="flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-700 rounded-xl font-semibold"
            >
              <Lightbulb className="w-5 h-5" />
              Need a hint?
            </motion.button>
          )}

          {selectedAnswer !== null && !isCorrect && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRetry}
              className="flex items-center gap-2 px-6 py-3 bg-orange-100 text-orange-700 rounded-xl font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </motion.button>
          )}

          {isCorrect && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-xl font-bold"
            >
              {currentActivityIndex < activities.length - 1 ? (
                <>
                  Next <ArrowRight className="w-6 h-6" />
                </>
              ) : (
                <>
                  Finish! 🎉
                </>
              )}
            </motion.button>
          )}
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <AnimatePresence>
        {showEndDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 text-center"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Leave Session?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to stop playing?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndDialog(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
                >
                  Keep Playing
                </button>
                <button
                  onClick={handleEndSession}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
