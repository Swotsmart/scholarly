'use client';

/**
 * Early Years Layout
 * Child-friendly layout with appropriate styling and minimal distractions
 */

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useNativeBridge } from '@/hooks/use-native-bridge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function EarlyYearsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize native bridge (no-op when not in WebView)
  useNativeBridge();

  // Prevent accidental navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    // Only add listener if there's an active session
    // This would be connected to the store in production
    // window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        {children}
      </div>
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
