import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '@/stores/app-store';

/**
 * Hook to manage parental gate state.
 * The gate is valid for 15 minutes after passing.
 */
export function useParentalGate() {
  const isParentalGateValid = useAppStore((s) => s.isParentalGateValid);
  const setParentalGatePassed = useAppStore((s) => s.setParentalGatePassed);

  const requireGate = useCallback(
    (onPass: () => void) => {
      if (isParentalGateValid()) {
        onPass();
      } else {
        // Navigate to gate modal; the gate will set state on pass
        router.push('/parental-gate');
      }
    },
    [isParentalGateValid]
  );

  const passGate = useCallback(() => {
    setParentalGatePassed(true);
  }, [setParentalGatePassed]);

  const resetGate = useCallback(() => {
    setParentalGatePassed(false);
  }, [setParentalGatePassed]);

  return {
    isValid: isParentalGateValid(),
    requireGate,
    passGate,
    resetGate,
  };
}
