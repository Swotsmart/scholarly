'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  /** Estimated minutes to complete */
  estimatedMinutes: number;
}

export interface OnboardingProgress {
  completedSteps: string[];
  dismissed: boolean;
  startedAt: string;
}

// =============================================================================
// ROLE-SPECIFIC ONBOARDING STEPS
// =============================================================================

export const learnerOnboardingSteps: OnboardingStep[] = [
  { id: 'profile', title: 'Complete Your Profile', description: 'Tell us about your interests and learning goals so we can personalise your experience.', icon: 'User', href: '/profile', estimatedMinutes: 3 },
  { id: 'first-course', title: 'Start Your First Course', description: 'Browse the course catalogue and enrol in something that excites you.', icon: 'BookOpen', href: '/learning', estimatedMinutes: 5 },
  { id: 'ai-buddy', title: 'Meet Your AI Buddy', description: 'Your personal learning assistant is ready to help with questions, explanations, and study tips.', icon: 'Bot', href: '/ai-buddy', estimatedMinutes: 2 },
  { id: 'golden-path', title: 'Discover Your Golden Path', description: 'Our adaptive system maps a personalised learning journey tailored to your strengths and gaps.', icon: 'Compass', href: '/golden-path', estimatedMinutes: 5 },
  { id: 'daily-goal', title: 'Set Your Daily Goal', description: 'Choose how much time you want to invest each day — consistency builds mastery.', icon: 'Target', href: '/settings', estimatedMinutes: 1 },
];

export const teacherOnboardingSteps: OnboardingStep[] = [
  { id: 'profile', title: 'Set Up Your Profile', description: 'Add your qualifications, subjects, and teaching preferences.', icon: 'User', href: '/profile', estimatedMinutes: 3 },
  { id: 'first-class', title: 'Create Your First Class', description: 'Set up a class, add students, and configure your gradebook in one flow.', icon: 'School', href: '/teacher/classes', estimatedMinutes: 5 },
  { id: 'attendance', title: 'Try Quick Attendance', description: 'See how fast attendance can be — tap or scan, and you\'re done.', icon: 'ClipboardCheck', href: '/teacher/scheduling', estimatedMinutes: 2 },
  { id: 'lesson-plan', title: 'Create a Lesson Plan', description: 'Use our AI-assisted lesson planner to design engaging, curriculum-aligned lessons.', icon: 'BookMarked', href: '/teacher/lesson-planner', estimatedMinutes: 10 },
  { id: 'grading', title: 'Grade Your First Assignment', description: 'Experience AI-assisted grading with rubric suggestions and bulk actions.', icon: 'FileText', href: '/teacher/grading', estimatedMinutes: 5 },
];

export const parentOnboardingSteps: OnboardingStep[] = [
  { id: 'profile', title: 'Complete Your Profile', description: 'Tell us about your family so we can connect you to the right information.', icon: 'User', href: '/profile', estimatedMinutes: 3 },
  { id: 'add-children', title: 'Link Your Children', description: 'Connect to your children\'s accounts to see their progress and receive updates.', icon: 'Users', href: '/parent/children', estimatedMinutes: 3 },
  { id: 'explore-progress', title: 'View Learning Progress', description: 'See real-time insights into your children\'s academic journey.', icon: 'TrendingUp', href: '/parent/progress', estimatedMinutes: 2 },
  { id: 'messages', title: 'Check Messages', description: 'Stay connected with teachers and tutors through our messaging system.', icon: 'MessageSquare', href: '/parent/messages', estimatedMinutes: 1 },
  { id: 'book-tutor', title: 'Explore Tutoring', description: 'Browse verified tutors matched to your child\'s needs and learning style.', icon: 'GraduationCap', href: '/parent/tutoring', estimatedMinutes: 5 },
];

export const tutorOnboardingSteps: OnboardingStep[] = [
  { id: 'profile', title: 'Build Your Tutor Profile', description: 'Our AI Profile Builder helps you create a compelling profile that attracts the right students.', icon: 'User', href: '/tutoring/profile', estimatedMinutes: 10 },
  { id: 'availability', title: 'Set Your Availability', description: 'Define when you\'re available for sessions — our scheduling engine handles the rest.', icon: 'CalendarClock', href: '/tutoring/availability', estimatedMinutes: 3 },
  { id: 'pricing', title: 'Configure Pricing', description: 'Set your hourly rate, package deals, and introductory offers.', icon: 'CreditCard', href: '/tutoring/earnings', estimatedMinutes: 3 },
  { id: 'first-resource', title: 'Upload a Resource', description: 'Share a sample lesson plan or resource to showcase your teaching approach.', icon: 'BookOpen', href: '/tutoring/resources', estimatedMinutes: 5 },
];

export const adminOnboardingSteps: OnboardingStep[] = [
  { id: 'org-setup', title: 'Configure Your Organisation', description: 'Set up your school or organisation details, branding, and domain.', icon: 'Building', href: '/admin/settings', estimatedMinutes: 5 },
  { id: 'invite-users', title: 'Invite Your Team', description: 'Add teachers, administrators, and support staff to the platform.', icon: 'Users', href: '/admin/users', estimatedMinutes: 5 },
  { id: 'review-compliance', title: 'Review Compliance Settings', description: 'Ensure data protection, safeguarding, and curriculum standards are configured.', icon: 'Shield', href: '/admin/standards', estimatedMinutes: 5 },
  { id: 'explore-analytics', title: 'Explore Analytics', description: 'See real-time dashboards showing platform adoption and learning outcomes.', icon: 'BarChart3', href: '/admin/reports', estimatedMinutes: 3 },
];

export function getOnboardingStepsForRole(role: string | undefined): OnboardingStep[] {
  switch (role) {
    case 'teacher':
    case 'educator': return teacherOnboardingSteps;
    case 'parent':
    case 'guardian': return parentOnboardingSteps;
    case 'tutor':
    case 'tutor_professional': return tutorOnboardingSteps;
    case 'platform_admin':
    case 'admin': return adminOnboardingSteps;
    default: return learnerOnboardingSteps;
  }
}

// =============================================================================
// ONBOARDING STORE
// =============================================================================

interface OnboardingState {
  completedSteps: string[];
  dismissed: boolean;
  completeStep: (stepId: string) => void;
  dismiss: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completedSteps: [],
      dismissed: false,
      completeStep: (stepId: string) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(stepId)
            ? state.completedSteps
            : [...state.completedSteps, stepId],
        })),
      dismiss: () => set({ dismissed: true }),
      reset: () => set({ completedSteps: [], dismissed: false }),
    }),
    { name: 'scholarly-onboarding' }
  )
);
