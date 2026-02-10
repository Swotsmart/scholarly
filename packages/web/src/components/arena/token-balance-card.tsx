'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Zap, Gem, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface TokenBalanceCardProps {
  tokenType: 'sparks' | 'gems' | 'voice';
  available: number;
  staked: number;
  lifetime: number;
}

const tokenConfig: Record<string, {
  icon: LucideIcon;
  label: string;
  color: string;
  gradient: string;
  textColor: string;
}> = {
  sparks: {
    icon: Zap,
    label: 'Sparks',
    color: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-400 to-amber-600',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  gems: {
    icon: Gem,
    label: 'Gems',
    color: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
  voice: {
    icon: MessageCircle,
    label: 'Voice',
    color: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
};

export function TokenBalanceCard({ tokenType, available, staked, lifetime }: TokenBalanceCardProps) {
  const config = tokenConfig[tokenType];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1.5 bg-gradient-to-r', config.gradient)} />
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg bg-muted p-2', config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{config.label}</p>
            <p className={cn('text-2xl font-bold tracking-tight', config.textColor)}>
              {available.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>Staked: {staked.toLocaleString()}</span>
          <span>Lifetime: {lifetime.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
