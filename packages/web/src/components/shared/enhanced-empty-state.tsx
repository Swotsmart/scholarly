'use client';

import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen, Users, Calendar, FileText, MessageSquare, GraduationCap,
  Sparkles, FolderOpen, ClipboardCheck, Trophy, ArrowRight,
} from 'lucide-react';

// =============================================================================
// ENHANCED EMPTY STATE
// =============================================================================

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary CTA */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Secondary CTA */
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  /** Optional tips shown below the CTA */
  tips?: string[];
  /** Visual variant */
  variant?: 'default' | 'illustration' | 'minimal';
  className?: string;
}

export function EnhancedEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  tips,
  variant = 'default',
  className,
}: EnhancedEmptyStateProps) {
  const ActionButton = actionHref ? 'a' : 'button';
  const SecondaryButton = secondaryHref ? 'a' : 'button';

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 text-center',
      variant === 'illustration' && 'py-16',
      variant === 'minimal' && 'py-8',
      className,
    )}>
      {/* Icon / illustration */}
      {variant === 'illustration' ? (
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-8">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          {/* Decorative dots */}
          <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-yellow-400/60" />
          <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-blue-400/40" />
          <div className="absolute top-1/2 -right-5 h-2 w-2 rounded-full bg-purple-400/50" />
        </div>
      ) : (
        <div className={cn(
          'rounded-full p-4',
          variant === 'minimal' ? 'bg-muted/50' : 'bg-muted'
        )}>
          <Icon className={cn(
            'text-muted-foreground',
            variant === 'minimal' ? 'h-6 w-6' : 'h-8 w-8'
          )} />
        </div>
      )}

      {/* Text */}
      <h3 className={cn(
        'mt-4 font-semibold',
        variant === 'illustration' ? 'text-xl' : 'text-lg'
      )}>
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Actions */}
      {(actionLabel || secondaryLabel) && (
        <div className="mt-5 flex items-center gap-3">
          {actionLabel && (
            <Button onClick={onAction} {...(actionHref ? { asChild: true } : {})}>
              {actionHref ? (
                <a href={actionHref}>
                  {actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              ) : (
                <>
                  {actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {secondaryLabel && (
            <Button variant="outline" onClick={onSecondary} {...(secondaryHref ? { asChild: true } : {})}>
              {secondaryHref ? (
                <a href={secondaryHref}>{secondaryLabel}</a>
              ) : (
                secondaryLabel
              )}
            </Button>
          )}
        </div>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="mt-6 max-w-sm text-left">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Quick Tips
          </p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Sparkles className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CONTEXTUAL EMPTY STATE PRESETS
// =============================================================================

export function NoCourses() {
  return (
    <EnhancedEmptyState
      icon={BookOpen}
      title="No Courses Yet"
      description="Start your learning journey by browsing our course catalogue. We'll recommend courses based on your interests and goals."
      actionLabel="Browse Courses"
      actionHref="/learning"
      secondaryLabel="Set Learning Goals"
      secondaryHref="/golden-path"
      variant="illustration"
      tips={[
        "Courses adapt to your pace — no pressure to keep up",
        "Your AI Buddy can recommend courses based on your interests",
        "Complete courses to earn XP and unlock achievements",
      ]}
    />
  );
}

export function NoStudents() {
  return (
    <EnhancedEmptyState
      icon={Users}
      title="No Students Added"
      description="Create your first class and invite students to get started. You can import from a CSV or add them manually."
      actionLabel="Create a Class"
      actionHref="/teacher/classes"
      variant="illustration"
      tips={[
        "Import students from a CSV file for bulk setup",
        "Students receive email invitations automatically",
        "The Intelligence Mesh begins learning from day one",
      ]}
    />
  );
}

export function NoSessions() {
  return (
    <EnhancedEmptyState
      icon={Calendar}
      title="No Sessions Scheduled"
      description="Set your availability and students will be able to book sessions with you. Our matching algorithm connects you with the right learners."
      actionLabel="Set Availability"
      actionHref="/tutoring/availability"
      variant="illustration"
    />
  );
}

export function NoGrades() {
  return (
    <EnhancedEmptyState
      icon={FileText}
      title="No Grades to Display"
      description="Grades will appear here once assignments have been marked. Our AI-assisted grading can speed up the process significantly."
      actionLabel="Go to Grading"
      actionHref="/teacher/grading"
      variant="default"
    />
  );
}

export function NoMessages() {
  return (
    <EnhancedEmptyState
      icon={MessageSquare}
      title="No Messages"
      description="Your inbox is empty. Messages from teachers, tutors, and the system will appear here."
      variant="minimal"
    />
  );
}

export function NoChildren() {
  return (
    <EnhancedEmptyState
      icon={Users}
      title="No Children Linked"
      description="Link your children's accounts to see their progress, communicate with teachers, and manage their learning journey."
      actionLabel="Link a Child"
      actionHref="/parent/children"
      variant="illustration"
      tips={[
        "You'll need your child's student ID or invitation code",
        "You can link multiple children to one parent account",
        "Once linked, you'll receive real-time progress updates",
      ]}
    />
  );
}

export function NoAchievements() {
  return (
    <EnhancedEmptyState
      icon={Trophy}
      title="No Achievements Yet"
      description="Complete courses, maintain your streak, and tackle challenges to earn badges and achievements."
      actionLabel="Start Learning"
      actionHref="/learning"
      variant="illustration"
    />
  );
}

export function NoResults() {
  return (
    <EnhancedEmptyState
      icon={FolderOpen}
      title="No Results Found"
      description="Try adjusting your search or filters. If you're looking for something specific, our AI Buddy might be able to help."
      secondaryLabel="Ask AI Buddy"
      secondaryHref="/ai-buddy"
      variant="minimal"
    />
  );
}

export function NoAttendance() {
  return (
    <EnhancedEmptyState
      icon={ClipboardCheck}
      title="No Attendance Records"
      description="Attendance records will appear here once you start taking roll. Try our one-tap attendance for a faster experience."
      actionLabel="Take Attendance"
      actionHref="/teacher/scheduling"
      variant="default"
    />
  );
}
