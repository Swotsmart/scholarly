'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-recover from chunk loading errors (caused by deployments)
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed');

    if (isChunkError) {
      // Reload the page to get fresh chunks
      window.location.reload();
      return;
    }

    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. This may be due to a recent update.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={reset} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
