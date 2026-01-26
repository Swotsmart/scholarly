'use client';

/**
 * Early Years Main Page (Little Explorers)
 * Handles:
 * 1. Child selection
 * 2. Picture password authentication
 * 3. Child dashboard with progress
 * 4. Session flow (world -> mentor -> learning)
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { ChildSelector } from '@/components/early-years/child-selector';
import { PicturePassword } from '@/components/early-years/picture-password';
import { WorldSelector } from '@/components/early-years/world-selector';
import { MentorSelector } from '@/components/early-years/mentor-selector';
import { ChildDashboard } from '@/components/early-years/child-dashboard';
import type { Child } from '@/types/early-years';

type FlowStep =
  | 'loading'
  | 'select-child'
  | 'picture-password'
  | 'setup-password'
  | 'dashboard'
  | 'select-world'
  | 'select-mentor'
  | 'session';

export default function EarlyYearsPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<FlowStep>('loading');

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

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Header for Parents */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌟</span>
            <span className="font-bold text-purple-600">Little Explorers</span>
          </div>
          {activeChild && isChildAuthenticated && (
            <Link
              href="/early-years/parent"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Parent Dashboard
            </Link>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {currentStep === 'loading' && (
            <motion.div
              key="loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[80vh]"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-16 h-16 text-purple-500" />
              </motion.div>
              <p className="mt-4 text-xl text-gray-600">Loading your adventure...</p>
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

          {/* Child Dashboard */}
          {currentStep === 'dashboard' && childDashboard && (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ChildDashboard
                dashboard={childDashboard}
                onStartSession={handleStartSession}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {/* Dashboard Loading */}
          {currentStep === 'dashboard' && !childDashboard && isLoadingDashboard && (
            <motion.div
              key="dashboard-loading"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center min-h-[80vh]"
            >
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="mt-4 text-lg text-gray-600">Getting your dashboard ready...</p>
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

      {/* Fun Decorative Elements */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-32 z-0">
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-4 left-8 text-4xl"
        >
          ☁️
        </motion.div>
        <motion.div
          animate={{
            x: [0, -15, 0],
            y: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute bottom-8 right-12 text-3xl"
        >
          ☁️
        </motion.div>
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-2 left-1/3 text-2xl"
        >
          🦋
        </motion.div>
        <motion.div
          animate={{
            y: [0, -15, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          className="absolute bottom-6 right-1/4 text-2xl"
        >
          🌸
        </motion.div>
      </div>
    </div>
  );
}
