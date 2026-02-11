/**
 * Early Years State Management (Zustand)
 * Manages child authentication, sessions, and learning state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Child,
  Family,
  LearningSession,
  LearningWorld,
  Mentor,
  ChildDashboard,
} from '@/types/early-years';
import { earlyYearsApi } from '@/lib/early-years-api';

interface EarlyYearsState {
  // Family state
  family: Family | null;
  children: Child[];
  isLoadingFamily: boolean;

  // Child authentication state
  activeChild: Child | null;
  childToken: string | null;
  isChildAuthenticated: boolean;

  // Session state
  currentSession: LearningSession | null;
  selectedWorld: LearningWorld | null;
  selectedMentor: Mentor | null;

  // Dashboard state
  childDashboard: ChildDashboard | null;
  isLoadingDashboard: boolean;

  // Picture password state
  picturePasswordSequence: string[];
  isSettingUpPassword: boolean;

  // Audio preferences
  voicePersona: 'pip' | 'sarah' | 'alex' | 'willow';
  audioEnabled: boolean;

  // Actions - Family
  loadFamily: () => Promise<void>;
  setFamily: (family: Family) => void;

  // Actions - Child Auth
  selectChild: (child: Child) => void;
  authenticateChild: (childId: string, imageSequence: string[]) => Promise<boolean>;
  logoutChild: () => void;

  // Actions - Picture Password
  addToPicturePassword: (imageId: string) => void;
  removeFromPicturePassword: (index: number) => void;
  clearPicturePassword: () => void;
  setupPicturePassword: (childId: string) => Promise<boolean>;

  // Actions - Audio
  setVoicePersona: (persona: 'pip' | 'sarah' | 'alex' | 'willow') => void;
  setAudioEnabled: (enabled: boolean) => void;

  // Actions - Sessions
  setSelectedWorld: (world: LearningWorld) => void;
  setSelectedMentor: (mentor: Mentor) => void;
  startSession: () => Promise<LearningSession | null>;
  endSession: (data?: { childMoodRating?: number; parentNotes?: string }) => Promise<void>;

  // Actions - Dashboard
  loadChildDashboard: (childId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  family: null,
  children: [],
  isLoadingFamily: false,
  activeChild: null,
  childToken: null,
  isChildAuthenticated: false,
  currentSession: null,
  selectedWorld: null,
  selectedMentor: null,
  childDashboard: null,
  isLoadingDashboard: false,
  picturePasswordSequence: [],
  isSettingUpPassword: false,
  voicePersona: 'pip' as const,
  audioEnabled: true,
};

export const useEarlyYearsStore = create<EarlyYearsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ===========================================================================
      // FAMILY ACTIONS
      // ===========================================================================

      loadFamily: async () => {
        set({ isLoadingFamily: true });
        try {
          const family = await earlyYearsApi.getMyFamily();
          set({
            family,
            children: family.children || [],
            isLoadingFamily: false,
          });
        } catch (error) {
          console.error('Failed to load family:', error);
          set({ isLoadingFamily: false });
        }
      },

      setFamily: (family) => {
        set({
          family,
          children: family.children || [],
        });
      },

      // ===========================================================================
      // CHILD AUTHENTICATION ACTIONS
      // ===========================================================================

      selectChild: (child) => {
        set({
          activeChild: child,
          isChildAuthenticated: false,
          childToken: null,
          picturePasswordSequence: [],
        });
      },

      authenticateChild: async (childId, imageSequence) => {
        try {
          const result = await earlyYearsApi.verifyPicturePassword(childId, imageSequence);

          if (result.success && result.childToken) {
            const child = get().children.find((c) => c.id === childId);
            set({
              isChildAuthenticated: true,
              childToken: result.childToken,
              activeChild: child || get().activeChild,
              picturePasswordSequence: [],
            });
            return true;
          }

          return false;
        } catch (error) {
          console.error('Authentication failed:', error);
          return false;
        }
      },

      logoutChild: () => {
        const currentSession = get().currentSession;
        if (currentSession) {
          // End any active session
          earlyYearsApi.endSession(currentSession.id, { completedNaturally: false });
        }

        set({
          activeChild: null,
          childToken: null,
          isChildAuthenticated: false,
          currentSession: null,
          selectedWorld: null,
          selectedMentor: null,
          childDashboard: null,
          picturePasswordSequence: [],
        });
      },

      // ===========================================================================
      // PICTURE PASSWORD ACTIONS
      // ===========================================================================

      addToPicturePassword: (imageId) => {
        const sequence = get().picturePasswordSequence;
        if (sequence.length < 6) {
          set({ picturePasswordSequence: [...sequence, imageId] });
        }
      },

      removeFromPicturePassword: (index) => {
        const sequence = [...get().picturePasswordSequence];
        sequence.splice(index, 1);
        set({ picturePasswordSequence: sequence });
      },

      clearPicturePassword: () => {
        set({ picturePasswordSequence: [] });
      },

      setupPicturePassword: async (childId) => {
        const sequence = get().picturePasswordSequence;
        if (sequence.length < 3) {
          return false;
        }

        set({ isSettingUpPassword: true });
        try {
          const result = await earlyYearsApi.setupPicturePassword(childId, sequence);
          set({
            isSettingUpPassword: false,
            picturePasswordSequence: [],
          });

          // Update child's hasPicturePassword status
          const children = get().children.map((c) =>
            c.id === childId ? { ...c, hasPicturePassword: true } : c
          );
          set({ children });

          return result.success;
        } catch (error) {
          console.error('Failed to setup picture password:', error);
          set({ isSettingUpPassword: false });
          return false;
        }
      },

      // ===========================================================================
      // AUDIO ACTIONS
      // ===========================================================================

      setVoicePersona: (persona) => {
        set({ voicePersona: persona });
      },

      setAudioEnabled: (enabled) => {
        set({ audioEnabled: enabled });
      },

      // ===========================================================================
      // SESSION ACTIONS
      // ===========================================================================

      setSelectedWorld: (world) => {
        set({ selectedWorld: world });
      },

      setSelectedMentor: (mentor) => {
        set({ selectedMentor: mentor });
      },

      startSession: async () => {
        const { activeChild, selectedWorld, selectedMentor } = get();

        if (!activeChild || !selectedWorld || !selectedMentor) {
          console.error('Cannot start session: missing child, world, or mentor');
          return null;
        }

        try {
          const { session } = await earlyYearsApi.startSession(activeChild.id, {
            world: selectedWorld,
            mentor: selectedMentor,
          });

          set({ currentSession: session });
          return session;
        } catch (error) {
          console.error('Failed to start session:', error);
          return null;
        }
      },

      endSession: async (data) => {
        const session = get().currentSession;
        if (!session) return;

        try {
          await earlyYearsApi.endSession(session.id, {
            completedNaturally: true,
            ...data,
          });

          set({
            currentSession: null,
            selectedWorld: null,
            selectedMentor: null,
          });

          // Refresh dashboard
          const activeChild = get().activeChild;
          if (activeChild) {
            get().loadChildDashboard(activeChild.id);
          }
        } catch (error) {
          console.error('Failed to end session:', error);
        }
      },

      // ===========================================================================
      // DASHBOARD ACTIONS
      // ===========================================================================

      loadChildDashboard: async (childId) => {
        set({ isLoadingDashboard: true });
        try {
          const { dashboard } = await earlyYearsApi.getChildDashboard(childId);
          set({
            childDashboard: dashboard,
            isLoadingDashboard: false,
          });
        } catch (error) {
          console.error('Failed to load child dashboard:', error);
          set({ isLoadingDashboard: false });
        }
      },

      // ===========================================================================
      // RESET
      // ===========================================================================

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'early-years-storage',
      partialize: (state) => ({
        // Only persist essential state
        family: state.family,
        children: state.children,
        activeChild: state.activeChild,
        childToken: state.childToken,
        isChildAuthenticated: state.isChildAuthenticated,
        voicePersona: state.voicePersona,
        audioEnabled: state.audioEnabled,
      }),
    }
  )
);

// Selector hooks for common state slices
export const useActiveChild = () => useEarlyYearsStore((state) => state.activeChild);
export const useIsChildAuthenticated = () =>
  useEarlyYearsStore((state) => state.isChildAuthenticated);
export const useCurrentSession = () => useEarlyYearsStore((state) => state.currentSession);
export const usePicturePassword = () =>
  useEarlyYearsStore((state) => state.picturePasswordSequence);
