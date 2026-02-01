'use client';

/**
 * Early Years Main Page (Little Explorers)
 * UI/UX Design System v2.0 Compliant
 *
 * Features:
 * - Large touch targets (44px minimum) for young children
 * - Picture-based icons with minimal text
 * - Audio narration for all instructions
 * - Celebratory animations and mentor characters
 * - Pre-literate authentication (picture password)
 * - PIN-based parent access
 *
 * Handles:
 * 1. Child selection with large avatars
 * 2. Picture password authentication
 * 3. Child dashboard with visual progress (stars, achievements)
 * 4. Session flow (world -> mentor -> learning)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, Home, Volume2, VolumeX, Star, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { ChildSelector } from '@/components/early-years/child-selector';
import { PicturePassword } from '@/components/early-years/picture-password';
import { WorldSelector } from '@/components/early-years/world-selector';
import { MentorSelector } from '@/components/early-years/mentor-selector';
import { ChildDashboard } from '@/components/early-years/child-dashboard';
import type { Child } from '@/types/early-years';
import { cn } from '@/lib/utils';

// Design System v2.0: Minimum touch target size for children
const TOUCH_TARGET_SIZE = 44;

// Audio narration messages for pre-literate users
const AUDIO_MESSAGES = {
  welcome: "Welcome to Little Explorers! Who's playing today?",
  selectChild: "Tap on your picture to start!",
  enterPassword: "Tap your secret pictures in order!",
  setupPassword: "Let's make your secret pictures! Pick pictures you'll remember.",
  dashboard: "Great job! What would you like to do today?",
  selectWorld: "Where would you like to explore today?",
  selectMentor: "Who would you like to learn with?",
  loading: "Getting ready for your adventure!",
};

// Celebratory star burst animation component
function StarBurst({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: '50vw',
              y: '50vh',
              scale: 0,
              opacity: 1
            }}
            animate={{
              x: `${20 + Math.random() * 60}vw`,
              y: `${10 + Math.random() * 80}vh`,
              scale: [0, 1.5, 0],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.05,
              ease: "easeOut"
            }}
            className="absolute text-4xl"
          >
            {['star', 'sparkles', 'heart'].includes(['star', 'sparkles', 'heart'][i % 3]) && (
              <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            )}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

// Parent PIN modal component
function ParentPinModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const PARENT_PIN = '1234'; // In production, this would be stored securely

  const handlePinEntry = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === PARENT_PIN) {
          setPin('');
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 1000);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Parent Access</h2>
          <p className="text-gray-500 text-sm mt-1">Enter your 4-digit PIN</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold",
                pin.length > i
                  ? error
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-purple-400 bg-purple-50 text-purple-600"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              {pin.length > i ? '*' : ''}
            </motion.div>
          ))}
        </div>

        {/* Number Pad - Large touch targets */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (key === 'del') handleDelete();
                else if (key !== '') handlePinEntry(key);
              }}
              disabled={key === ''}
              className={cn(
                "h-14 rounded-xl font-bold text-xl transition-colors",
                "min-h-[44px] min-w-[44px]", // Design System v2.0: 44px minimum touch target
                key === ''
                  ? "invisible"
                  : key === 'del'
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
              )}
            >
              {key === 'del' ? 'DEL' : key}
            </motion.button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700 font-medium"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

type FlowStep =
  | 'loading'
  | 'select-child'
  | 'picture-password'
  | 'setup-password'
  | 'dashboard'
  | 'select-world'
  | 'select-mentor'
  | 'session';

// Quick action cards for the dashboard
const QUICK_ACTIONS = [
  {
    id: 'phonics',
    icon: '🌲',
    label: 'Phonics Forest',
    color: 'from-emerald-400 to-green-600',
    path: '/early-years/phonics',
    audio: 'Learn letters and sounds!',
  },
  {
    id: 'numbers',
    icon: '🔢',
    label: 'Number Land',
    color: 'from-blue-400 to-indigo-600',
    path: '/early-years/activity/numbers',
    audio: 'Play with numbers!',
  },
  {
    id: 'stories',
    icon: '📚',
    label: 'Story Garden',
    color: 'from-purple-400 to-pink-600',
    path: '/early-years/activity/stories',
    audio: 'Read magical stories!',
  },
  {
    id: 'art',
    icon: '🎨',
    label: 'Creative Cove',
    color: 'from-orange-400 to-red-500',
    path: '/early-years/activity/art',
    audio: 'Create amazing art!',
  },
];

export default function EarlyYearsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FlowStep>('loading');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showParentPin, setShowParentPin] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    family,
    children,
    isLoadingFamily,
    activeChild,
    isChildAuthenticated,
    selectedWorld,
    selectedMentor,
    childDashboard,
    isLoadingDashboard,
    loadFamily,
    selectChild,
    logoutChild,
    setSelectedWorld,
    setSelectedMentor,
    startSession,
    loadChildDashboard,
  } = useEarlyYearsStore();

  // Text-to-speech helper for audio narration
  const speakMessage = useCallback((message: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.85; // Slower for children
    utterance.pitch = 1.1; // Slightly higher pitch
    utterance.volume = 1;

    // Try to use a child-friendly voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
      v.name.includes('Samantha') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Female')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled]);

  // Speak step-specific messages
  useEffect(() => {
    const stepMessages: Record<FlowStep, string | undefined> = {
      loading: AUDIO_MESSAGES.loading,
      'select-child': AUDIO_MESSAGES.welcome,
      'picture-password': AUDIO_MESSAGES.enterPassword,
      'setup-password': AUDIO_MESSAGES.setupPassword,
      dashboard: AUDIO_MESSAGES.dashboard,
      'select-world': AUDIO_MESSAGES.selectWorld,
      'select-mentor': AUDIO_MESSAGES.selectMentor,
      session: undefined,
    };

    const message = stepMessages[currentStep];
    if (message) {
      // Delay slightly to let animations complete
      const timer = setTimeout(() => speakMessage(message), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, speakMessage]);

  // Load family on mount
  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  // Determine current step based on state
  useEffect(() => {
    if (isLoadingFamily) {
      setCurrentStep('loading');
      return;
    }

    if (!activeChild) {
      setCurrentStep('select-child');
      return;
    }

    if (!activeChild.hasPicturePassword) {
      setCurrentStep('setup-password');
      return;
    }

    if (!isChildAuthenticated) {
      setCurrentStep('picture-password');
      return;
    }

    if (selectedWorld && selectedMentor) {
      setCurrentStep('session');
      return;
    }

    if (selectedWorld) {
      setCurrentStep('select-mentor');
      return;
    }

    setCurrentStep('dashboard');
  }, [isLoadingFamily, activeChild, isChildAuthenticated, selectedWorld, selectedMentor]);

  // Load child dashboard when authenticated
  useEffect(() => {
    if (isChildAuthenticated && activeChild && !childDashboard) {
      loadChildDashboard(activeChild.id);
    }
  }, [isChildAuthenticated, activeChild, childDashboard, loadChildDashboard]);

  const handleSelectChild = (child: Child) => {
    selectChild(child);
  };

  const handlePasswordSuccess = () => {
    // Show celebration animation
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
    // Will trigger useEffect to move to dashboard
  };

  const handleStartSession = () => {
    setCurrentStep('select-world');
  };

  const handleWorldSelected = () => {
    setCurrentStep('select-mentor');
  };

  const handleMentorSelected = async () => {
    const session = await startSession();
    if (session) {
      // Navigate to the learning session page
      router.push(`/early-years/session/${session.id}`);
    }
  };

  const handleBackFromMentor = () => {
    setSelectedMentor(null as any);
    setCurrentStep('select-world');
  };

  const handleLogout = () => {
    logoutChild();
    setCurrentStep('select-child');
  };

  const handleAddChild = () => {
    router.push('/early-years/enroll');
  };

  const handleParentAccess = () => {
    setShowParentPin(true);
  };

  const handleParentPinSuccess = () => {
    setShowParentPin(false);
    router.push('/early-years/parent');
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    speakMessage(action.audio);
    router.push(action.path);
  };

  const toggleAudio = () => {
    if (audioEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAudioEnabled(!audioEnabled);
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // Floating stars animation for background
  const floatingStars = [...Array(6)].map((_, i) => ({
    delay: i * 0.5,
    duration: 3 + Math.random() * 2,
    x: 10 + (i * 15) + '%',
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-50">
      {/* Star burst celebration */}
      <StarBurst show={showCelebration} />

      {/* Parent PIN Modal */}
      <ParentPinModal
        isOpen={showParentPin}
        onClose={() => setShowParentPin(false)}
        onSuccess={handleParentPinSuccess}
      />

      {/* Navigation Header - Minimal text, picture-based for children */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Home button - Large touch target */}
          <Link
            href="/"
            className={cn(
              "flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors",
              `min-h-[${TOUCH_TARGET_SIZE}px] min-w-[${TOUCH_TARGET_SIZE}px] h-11 w-11`
            )}
            aria-label="Go home"
          >
            <Home className="w-6 h-6 text-gray-600" />
          </Link>

          {/* Logo with playful styling */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2"
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-3xl"
            >
              🌟
            </motion.span>
            <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Little Explorers
            </span>
          </motion.div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Audio toggle - Large touch target */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleAudio}
              className={cn(
                "flex items-center justify-center rounded-xl transition-colors",
                `min-h-[${TOUCH_TARGET_SIZE}px] min-w-[${TOUCH_TARGET_SIZE}px] h-11 w-11`,
                audioEnabled
                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
              aria-label={audioEnabled ? "Turn off sound" : "Turn on sound"}
            >
              {audioEnabled ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </motion.button>

            {/* Parent access - PIN protected */}
            {activeChild && isChildAuthenticated && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleParentAccess}
                className={cn(
                  "flex items-center justify-center rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors",
                  `min-h-[${TOUCH_TARGET_SIZE}px] min-w-[${TOUCH_TARGET_SIZE}px] h-11 w-11`
                )}
                aria-label="Parent dashboard"
              >
                <Lock className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          {/* Loading State - Child-friendly with animated character */}
          {currentStep === 'loading' && (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[80vh]"
            >
              {/* Animated loading character */}
              <motion.div
                animate={{
                  y: [0, -20, 0],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-8xl mb-6"
              >
                🦋
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mb-4"
              >
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="w-4 h-4 rounded-full bg-purple-500"
                    />
                  ))}
                </div>
              </motion.div>
              <p className="text-2xl font-bold text-purple-600">Getting ready...</p>
              <p className="text-lg text-gray-500 mt-2">Your adventure awaits!</p>
            </motion.div>
          )}

          {/* Child Selection */}
          {currentStep === 'select-child' && (
            <motion.div
              key="select-child"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-8"
            >
              <ChildSelector
                children={children}
                onSelectChild={handleSelectChild}
                onAddChild={handleAddChild}
              />
            </motion.div>
          )}

          {/* Setup Picture Password */}
          {currentStep === 'setup-password' && activeChild && (
            <motion.div
              key="setup-password"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-8"
            >
              <PicturePassword
                childId={activeChild.id}
                childName={activeChild.preferredName || activeChild.firstName}
                mode="setup"
                onSuccess={handlePasswordSuccess}
                onCancel={handleLogout}
              />
            </motion.div>
          )}

          {/* Picture Password Login */}
          {currentStep === 'picture-password' && activeChild && (
            <motion.div
              key="picture-password"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-8"
            >
              <PicturePassword
                childId={activeChild.id}
                childName={activeChild.preferredName || activeChild.firstName}
                mode="login"
                onSuccess={handlePasswordSuccess}
                onCancel={handleLogout}
              />
            </motion.div>
          )}

          {/* Child Dashboard - Enhanced with quick actions */}
          {currentStep === 'dashboard' && childDashboard && (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Quick Action Cards - Large touch targets, picture-based */}
              <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-bold text-gray-800 mb-4 text-center"
                >
                  What do you want to play? 🎮
                </motion.h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {QUICK_ACTIONS.map((action, index) => (
                    <motion.button
                      key={action.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "relative rounded-3xl overflow-hidden shadow-lg aspect-square",
                        "flex flex-col items-center justify-center p-4",
                        "bg-gradient-to-br text-white",
                        "min-h-[120px] min-w-[120px]", // Large touch target
                        action.color
                      )}
                    >
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-5xl mb-2"
                      >
                        {action.icon}
                      </motion.span>
                      <span className="font-bold text-sm text-center text-white/90">
                        {action.label}
                      </span>
                      {/* Sound indicator */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakMessage(action.audio);
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/50 transition-colors"
                      >
                        <Volume2 className="w-4 h-4 text-white" />
                      </button>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Original dashboard with progress */}
              <ChildDashboard
                dashboard={childDashboard}
                onStartSession={handleStartSession}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {/* Dashboard Loading - Animated */}
          {currentStep === 'dashboard' && !childDashboard && isLoadingDashboard && (
            <motion.div
              key="dashboard-loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[80vh]"
            >
              <motion.div
                animate={{
                  y: [0, -15, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-7xl mb-4"
              >
                🚀
              </motion.div>
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
              <p className="text-xl font-bold text-purple-600">Getting your stuff ready!</p>
            </motion.div>
          )}

          {/* World Selection */}
          {currentStep === 'select-world' && activeChild && (
            <motion.div
              key="select-world"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-8"
            >
              <WorldSelector
                currentLevel={activeChild.level}
                selectedWorld={selectedWorld}
                onSelectWorld={setSelectedWorld}
                onContinue={handleWorldSelected}
              />
            </motion.div>
          )}

          {/* Mentor Selection */}
          {currentStep === 'select-mentor' && (
            <motion.div
              key="select-mentor"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-8"
            >
              <MentorSelector
                selectedMentor={selectedMentor}
                onSelectMentor={setSelectedMentor}
                onContinue={handleMentorSelected}
                onBack={handleBackFromMentor}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fun Decorative Elements - Enhanced with more animations */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-40 z-0">
        {/* Clouds */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-6 left-[5%] text-5xl opacity-60"
        >
          ☁️
        </motion.div>
        <motion.div
          animate={{
            x: [0, -25, 0],
            y: [0, -8, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.5,
          }}
          className="absolute bottom-12 right-[10%] text-4xl opacity-50"
        >
          ☁️
        </motion.div>

        {/* Floating stars */}
        {floatingStars.map((star, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              opacity: [0.4, 1, 0.4],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: star.delay,
            }}
            style={{ left: star.x }}
            className="absolute bottom-8"
          >
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </motion.div>
        ))}

        {/* Animated characters */}
        <motion.div
          animate={{
            y: [0, -25, 0],
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-4 left-[30%] text-3xl"
        >
          🦋
        </motion.div>
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          className="absolute bottom-10 right-[25%] text-3xl"
        >
          🌸
        </motion.div>
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, -10, 10, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-2 left-[60%] text-2xl"
        >
          🌈
        </motion.div>

        {/* Rainbow arc at bottom */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-2 bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 opacity-30 rounded-t-full" />
      </div>

      {/* Sparkle effects on the sides */}
      <div className="fixed top-1/4 left-4 pointer-events-none">
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Sparkles className="w-8 h-8 text-purple-300" />
        </motion.div>
      </div>
      <div className="fixed top-1/3 right-6 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <Sparkles className="w-6 h-6 text-pink-300" />
        </motion.div>
      </div>
    </div>
  );
}
