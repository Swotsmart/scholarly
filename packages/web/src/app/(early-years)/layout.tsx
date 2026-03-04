'use client';

/**
 * Early Years Layout
 * Child-friendly layout with appropriate styling and minimal distractions.
 * Hosts the VoiceStatusBanner at the layout level so it appears on every
 * Little Explorers page without each page needing to implement it independently.
 */

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useNativeBridge } from '@/hooks/use-native-bridge';
import { usePhonicsAudio } from '@/hooks/use-phonics-audio';
import { VoiceStatusBanner } from '@/components/early-years/voice-status-banner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner layout that can use hooks (must be inside QueryClientProvider).
 * Monitors voice availability and surfaces the VoiceStatusBanner to every
 * Little Explorers page — children never see a silent app without explanation.
 */
function EarlyYearsInner({ children }: { children: React.ReactNode }) {
  useNativeBridge();
  const { isUsingFallback } = usePhonicsAudio();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Activate if an active session flag is set in the store (future enhancement)
    return () => { void handleBeforeUnload; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Voice status banner — child-facing, non-alarming, shown across all pages */}
      <VoiceStatusBanner
        isUsingFallback={isUsingFallback}
        audience="child"
        className="mx-4 mt-3"
      />
      {children}
    </div>
  );
}

export default function EarlyYearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <EarlyYearsInner>{children}</EarlyYearsInner>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontSize: '1.1rem',
            padding: '1rem',
            borderRadius: '1rem',
          },
        }}
      />
    </QueryClientProvider>
  );
}
