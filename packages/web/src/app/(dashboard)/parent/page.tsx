'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParentRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/parent/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}
