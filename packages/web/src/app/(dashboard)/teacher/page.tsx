'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/teacher/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-muted-foreground">Redirecting to Teacher Dashboard...</div>
    </div>
  );
}
