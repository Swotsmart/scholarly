import { create } from 'zustand';
import * as auth from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  children: { id: string; name: string; avatar: string; age: number }[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  hasCompletedOnboarding: boolean;
  hasConsentedCOPPA: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setOnboardingComplete: () => void;
  setCOPPAConsent: (consented: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  hasCompletedOnboarding: false,
  hasConsentedCOPPA: false,

  initialize: async () => {
    try {
      const token = await auth.getAuthToken();
      const userData = await auth.getUserData();
      if (token && userData) {
        set({
          isAuthenticated: true,
          token,
          user: userData as unknown as User,
          isLoading: false,
          hasCompletedOnboarding: true,
          hasConsentedCOPPA: true,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        'https://scholarly.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      await auth.setAuthToken(data.token);
      await auth.setUserData(data.user);

      set({
        isAuthenticated: true,
        token: data.token,
        user: data.user,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await auth.clearAuth();
    set({
      isAuthenticated: false,
      user: null,
      token: null,
    });
  },

  setOnboardingComplete: () => {
    set({ hasCompletedOnboarding: true });
  },

  setCOPPAConsent: (consented: boolean) => {
    set({ hasConsentedCOPPA: consented });
  },
}));
