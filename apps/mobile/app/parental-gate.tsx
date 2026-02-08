import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { ParentalGate } from '@/components/ParentalGate';

export default function ParentalGateModal() {
  const setParentalGatePassed = useAppStore((s) => s.setParentalGatePassed);

  const handlePass = useCallback(() => {
    setParentalGatePassed(true);
    router.back();
  }, [setParentalGatePassed]);

  const handleFail = useCallback(() => {
    setParentalGatePassed(false);
    router.back();
  }, [setParentalGatePassed]);

  return <ParentalGate onPass={handlePass} onFail={handleFail} />;
}
