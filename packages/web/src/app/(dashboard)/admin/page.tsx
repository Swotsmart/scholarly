'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-muted-foreground">Redirecting to Admin Dashboard...</div>
    </div>
  );
}
