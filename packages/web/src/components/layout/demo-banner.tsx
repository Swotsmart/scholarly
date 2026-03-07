'use client';

import { isDemoSession } from '@/lib/demo';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoSession() || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-sm">
      <span className="text-amber-700 dark:text-amber-400">
        You&apos;re exploring Scholarly in Demo Mode — data shown is illustrative.
      </span>
      <Link
        href="/login"
        className="ml-2 font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Start Free Trial →
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
