'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** The page title */
  title: string;
  /** Optional description text displayed below the title */
  description?: string;
  /** Optional action buttons to display on the right side */
  actions?: ReactNode;
  /** Additional className for the container */
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
