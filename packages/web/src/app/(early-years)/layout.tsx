'use client';

/**
 * Early Years Layout
 * Child-friendly layout with appropriate styling and minimal distractions
 */

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

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
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-purple-50 to-pink-100">
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
