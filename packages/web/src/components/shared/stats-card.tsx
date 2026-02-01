'use client';

import { type LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ColorVariant = 'primary' | 'success' | 'warning' | 'error';

const colorVariants: Record<ColorVariant, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  success: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  error: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

interface StatsCardProps {
  /** The label text displayed below the value */
  label: string;
  /** The main value to display (can be string or number) */
  value: string | number;
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Color variant for the icon container */
  variant?: ColorVariant;
  /** Change percentage (positive or negative) */
  change?: number;
  /** Additional subtitle text */
  subtitle?: string;
  /** Custom className for the card */
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  variant = 'primary',
  change,
  subtitle,
  className,
}: StatsCardProps) {
  const colors = colorVariants[variant];
  const isPositiveChange = change !== undefined && change >= 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg p-3', colors.bg)}>
            <Icon className={cn('h-6 w-6', colors.text)} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    isPositiveChange && 'text-green-500',
                    isNegativeChange && 'text-red-500'
                  )}
                >
                  {isPositiveChange ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
