'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  useOnboardingStore,
  getOnboardingStepsForRole,
  type OnboardingStep,
} from '@/stores/onboarding-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, X, ArrowRight,
  Rocket, PartyPopper, User, BookOpen, Bot, Compass, Target,
  School, ClipboardCheck, BookMarked, FileText, Users, TrendingUp,
  MessageSquare, GraduationCap, CalendarClock, CreditCard, Building,
  Shield, BarChart3, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// ICON MAP
// =============================================================================

const iconMap: Record<string, React.ElementType> = {
  User, BookOpen, Bot, Compass, Target, School, ClipboardCheck,
  BookMarked, FileText, Users, TrendingUp, MessageSquare,
  GraduationCap, CalendarClock, CreditCard, Building, Shield, BarChart3,
};

// =============================================================================
// ONBOARDING CHECKLIST
// =============================================================================

export function OnboardingChecklist() {
  const { user } = useAuthStore();
  const { completedSteps, dismissed, completeStep, dismiss } = useOnboardingStore();
  const [expanded, setExpanded] = useState(true);

  const steps = useMemo(() => getOnboardingStepsForRole(user?.role), [user?.role]);

  const completedCount = completedSteps.length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;
  const isComplete = completedCount >= totalSteps;

  // Don't show if dismissed or complete
  if (dismissed) return null;

  // Celebrate completion
  if (isComplete) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <PartyPopper className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                You're all set!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">
                You've completed all the getting started steps. Enjoy exploring Scholarly!
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={dismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Getting Started</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedCount} of {totalSteps} steps completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss} title="Dismiss onboarding">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2 mt-3" />
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const Icon = iconMap[step.icon] || Circle;

            return (
              <OnboardingStepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                isCompleted={isCompleted}
                icon={Icon}
                onComplete={() => completeStep(step.id)}
              />
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// =============================================================================
// INDIVIDUAL STEP CARD
// =============================================================================

interface OnboardingStepCardProps {
  step: OnboardingStep;
  stepNumber: number;
  isCompleted: boolean;
  icon: React.ElementType;
  onComplete: () => void;
}

function OnboardingStepCard({ step, stepNumber, isCompleted, icon: Icon, onComplete }: OnboardingStepCardProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-all',
        isCompleted
          ? 'bg-muted/30 border-muted opacity-60'
          : 'hover:border-primary/40 hover:shadow-sm'
      )}
    >
      {/* Status indicator */}
      <div className="mt-0.5 shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
            <span className="text-xs font-medium text-muted-foreground">{stepNumber}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className={cn('text-sm font-medium', isCompleted && 'line-through text-muted-foreground')}>
            {step.title}
          </p>
        </div>
        {!isCompleted && (
          <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
        )}
        {!isCompleted && (
          <div className="flex items-center gap-3 mt-2">
            <Link href={step.href} onClick={onComplete}>
              <Button size="sm" className="h-7 text-xs">
                Start <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~{step.estimatedMinutes} min
            </span>
          </div>
        )}
      </div>

      {/* Mark complete button for steps user may have done already */}
      {!isCompleted && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
          onClick={onComplete}
          title="Mark as complete"
        >
          <CheckCircle2 className="h-4 w-4 text-muted-foreground hover:text-green-500" />
        </Button>
      )}
    </div>
  );
}
