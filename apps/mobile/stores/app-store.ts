import { create } from 'zustand';

interface AppState {
  isOnline: boolean;
  activeChild: { id: string; name: string; avatar: string; age: number } | null;
  parentalGatePassed: boolean;
  parentalGateExpiry: number | null;
  subscriptionTier: string | null;

  setOnline: (isOnline: boolean) => void;
  setActiveChild: (child: AppState['activeChild']) => void;
  setParentalGatePassed: (passed: boolean) => void;
  setSubscriptionTier: (tier: string | null) => void;
  isParentalGateValid: () => boolean;
}

/** Parental gate is valid for 15 minutes */
const GATE_VALIDITY_MS = 15 * 60 * 1000;

export const useAppStore = create<AppState>((set, get) => ({
  isOnline: true,
  activeChild: null,
  parentalGatePassed: false,
  parentalGateExpiry: null,
  subscriptionTier: null,

  setOnline: (isOnline: boolean) => set({ isOnline }),

  setActiveChild: (child) => set({ activeChild: child }),

  setParentalGatePassed: (passed: boolean) =>
    set({
      parentalGatePassed: passed,
      parentalGateExpiry: passed ? Date.now() + GATE_VALIDITY_MS : null,
    }),

  setSubscriptionTier: (tier: string | null) => set({ subscriptionTier: tier }),

  isParentalGateValid: () => {
    const { parentalGatePassed, parentalGateExpiry } = get();
    if (!parentalGatePassed || !parentalGateExpiry) return false;
    return Date.now() < parentalGateExpiry;
  },
}));
