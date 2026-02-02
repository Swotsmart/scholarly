'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GradebookRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher/gradebook');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-muted-foreground">Redirecting to gradebook...</div>
    </div>
  );
}
