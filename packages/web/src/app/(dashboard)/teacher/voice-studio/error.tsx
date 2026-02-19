'use client';

import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function VoiceStudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Voice Studio error:', error);
  }, [error]);

  return (
    <div className="space-y-6 p-6">
      <Card className="border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                Voice Studio Error
              </h2>
              <p className="text-sm text-red-600 dark:text-red-300">
                {error.message || 'An unexpected error occurred loading the Voice Studio.'}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Digest: {error.digest}
                </p>
              )}
              <Button variant="outline" onClick={reset} className="mt-3">
                Try again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
