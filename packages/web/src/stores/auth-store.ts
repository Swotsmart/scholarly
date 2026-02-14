'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from '@/lib/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await api.auth.login(email, password);

          if (!response.success) {
            return { success: false, error: response.error };
          }

          const { user, accessToken } = response.data;
          api.setAccessToken(accessToken);

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Login failed',
          };
        }
      },

      register: async (data: RegisterData) => {
        try {
          const response = await api.auth.register(data);

          if (!response.success) {
            return { success: false, error: response.error };
          }

          const { user, accessToken } = response.data;
          api.setAccessToken(accessToken);

          set({
            user,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          };
        }
      },

      logout: async () => {
        try {
          await api.auth.logout();
        } catch {
          // Ignore logout errors
        }

        api.setAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setAccessToken: (token: string | null) => {
        api.setAccessToken(token);
        set({ accessToken: token });
      },

      checkAuth: async () => {
        const { accessToken, isAuthenticated, user } = get();

        // Already authenticated with user data — no need to re-check
        if (isAuthenticated && user && accessToken) {
          api.setAccessToken(accessToken);
          set({ isLoading: false });
          return;
        }

        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        api.setAccessToken(accessToken);

        try {
          const response = await api.auth.me();

          if (response.success) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Try to refresh token
            const refreshed = await get().refreshToken();
            if (!refreshed) {
              set({
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          }
        } catch {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshToken: async () => {
        try {
          const response = await api.auth.refresh();

          if (response.success) {
            const { accessToken } = response.data;
            api.setAccessToken(accessToken);
            set({ accessToken });

            // Fetch user after refresh
            const userResponse = await api.auth.me();
            if (userResponse.success) {
              set({
                user: userResponse.data,
                isAuthenticated: true,
                isLoading: false,
              });
              return true;
            }
          }

          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'scholarly-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
      }),
    }
  )
);
