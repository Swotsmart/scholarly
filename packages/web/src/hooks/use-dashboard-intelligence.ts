'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// =============================================================================
// TYPES
// =============================================================================

export type TimeOfDay = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
export type DayType = 'weekday' | 'weekend';

export interface TimeContext {
  timeOfDay: TimeOfDay;
  dayType: DayType;
  hour: number;
  greeting: string;
  /** A contextual subtitle — what should the user focus on right now? */
  focusHint: string;
}

export interface QuickInsight {
  id: string;
  icon: string;
  label: string;
  value: string | number;
  change?: number;
  href?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContinuationItem {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  href: string;
  lastActivity: string;
  /** Estimated minutes to complete the next step */
  nextStepMinutes?: number;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  time: string;
  type: 'class' | 'session' | 'deadline' | 'meeting' | 'event';
  href?: string;
  urgent?: boolean;
}

export interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  priority: number;
}

export interface DashboardIntelligence {
  time: TimeContext;
  insights: QuickInsight[];
  continuations: ContinuationItem[];
  upcoming: UpcomingEvent[];
  suggestions: ActionSuggestion[];
}

// =============================================================================
// TIME AWARENESS
// =============================================================================

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour < 6) return 'night';
  if (hour < 8) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function getGreeting(hour: number, firstName?: string): string {
  const name = firstName || 'there';
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

// =============================================================================
// TEACHER INTELLIGENCE
// =============================================================================

function getTeacherFocusHint(tod: TimeOfDay, dayType: DayType): string {
  if (dayType === 'weekend') return 'Catch up on grading or plan next week\'s lessons';
  switch (tod) {
    case 'early_morning': return 'Review today\'s schedule and take attendance';
    case 'morning': return 'Your first classes are underway — resources are ready';
    case 'midday': return 'Midday check-in — review any flagged students';
    case 'afternoon': return 'Wrap up grading before end of day';
    case 'evening': return 'Plan tomorrow\'s lessons while today is fresh';
    case 'night': return 'Rest up — tomorrow\'s schedule is prepared';
  }
}

function getTeacherInsights(tod: TimeOfDay): QuickInsight[] {
  // In production these come from API — here we demonstrate the contextual structure
  const base: QuickInsight[] = [
    { id: 'attendance', icon: 'ClipboardCheck', label: 'Attendance Today', value: '28/30', urgency: 'medium', href: '/teacher/scheduling' },
    { id: 'pending-grades', icon: 'FileText', label: 'Pending Grades', value: 12, urgency: 'high', href: '/teacher/grading' },
    { id: 'student-alerts', icon: 'AlertTriangle', label: 'Student Alerts', value: 3, urgency: 'critical', href: '/teacher/students' },
    { id: 'upcoming-classes', icon: 'Calendar', label: 'Classes Today', value: 5, urgency: 'low', href: '/teacher/classes' },
  ];

  // Morning: attendance is most important → push to front
  if (tod === 'early_morning' || tod === 'morning') {
    return [base[0], base[3], base[2], base[1]];
  }
  // Afternoon: grading becomes priority
  if (tod === 'afternoon' || tod === 'evening') {
    return [base[1], base[2], base[0], base[3]];
  }
  return base;
}

function getTeacherContinuations(): ContinuationItem[] {
  return [
    { id: 'tc1', title: 'Year 8 English — Essay Grading', subtitle: '7 of 24 essays marked', progress: 29, href: '/teacher/grading', lastActivity: '2 hours ago', nextStepMinutes: 15 },
    { id: 'tc2', title: 'Science Lesson Plan — Photosynthesis', subtitle: 'Activities section incomplete', progress: 60, href: '/teacher/lesson-planner', lastActivity: 'Yesterday', nextStepMinutes: 20 },
  ];
}

function getTeacherUpcoming(tod: TimeOfDay): UpcomingEvent[] {
  const events: UpcomingEvent[] = [
    { id: 'tu1', title: 'Year 7 Maths', time: '9:00 AM', type: 'class', href: '/teacher/classes' },
    { id: 'tu2', title: 'Year 8 English', time: '10:30 AM', type: 'class', href: '/teacher/classes' },
    { id: 'tu3', title: 'Staff Meeting', time: '3:30 PM', type: 'meeting' },
    { id: 'tu4', title: 'Report Cards Due', time: 'Friday', type: 'deadline', urgent: true },
  ];
  // If afternoon, filter out past events
  if (tod === 'afternoon' || tod === 'evening') {
    return events.slice(2);
  }
  return events;
}

function getTeacherSuggestions(tod: TimeOfDay): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];
  if (tod === 'early_morning' || tod === 'morning') {
    suggestions.push({ id: 'ts1', title: 'Take Attendance', description: 'Morning roll call for Period 1', href: '/teacher/scheduling', icon: 'ClipboardCheck', priority: 1 });
  }
  if (tod === 'afternoon' || tod === 'evening') {
    suggestions.push({ id: 'ts2', title: 'Grade Pending Work', description: '12 assignments awaiting marks', href: '/teacher/grading', icon: 'FileText', priority: 1 });
  }
  suggestions.push({ id: 'ts3', title: 'Review Student Alerts', description: '3 students flagged by the Intelligence Mesh', href: '/teacher/students', icon: 'AlertTriangle', priority: 2 });
  return suggestions;
}

// =============================================================================
// LEARNER INTELLIGENCE
// =============================================================================

function getLearnerFocusHint(tod: TimeOfDay, dayType: DayType): string {
  if (dayType === 'weekend') return 'Great time to explore something new or practice skills';
  switch (tod) {
    case 'early_morning': return 'Start fresh — your daily challenge is waiting';
    case 'morning': return 'Pick up where you left off yesterday';
    case 'midday': return 'Quick break? Try a 5-minute vocabulary sprint';
    case 'afternoon': return 'Finish today\'s goal to keep your streak alive';
    case 'evening': return 'Review what you learned today before winding down';
    case 'night': return 'Rest well — your streak is safe until tomorrow';
  }
}

function getLearnerInsights(): QuickInsight[] {
  return [
    { id: 'streak', icon: 'Flame', label: 'Day Streak', value: 12, urgency: 'medium', href: '/achievements' },
    { id: 'daily-goal', icon: 'Target', label: 'Daily Goal', value: '75%', urgency: 'medium' },
    { id: 'xp', icon: 'Star', label: 'Total XP', value: '2,450', change: 120, urgency: 'low', href: '/achievements' },
    { id: 'tasks-due', icon: 'Clock', label: 'Tasks Due Today', value: 3, urgency: 'high', href: '/tasks' },
  ];
}

function getLearnerContinuations(): ContinuationItem[] {
  return [
    { id: 'lc1', title: 'Introduction to Design Thinking', subtitle: 'Next: Ideation Techniques', progress: 65, href: '/learning/design-thinking', lastActivity: '2 hours ago', nextStepMinutes: 12 },
    { id: 'lc2', title: 'Algebra Fundamentals', subtitle: 'Next: Quadratic Equations', progress: 40, href: '/learning/algebra', lastActivity: 'Yesterday', nextStepMinutes: 20 },
    { id: 'lc3', title: 'LinguaFlow — Spanish B1', subtitle: 'Next: Preterite Practice', progress: 55, href: '/linguaflow', lastActivity: '3 days ago', nextStepMinutes: 8 },
  ];
}

// =============================================================================
// PARENT INTELLIGENCE
// =============================================================================

function getParentFocusHint(tod: TimeOfDay, dayType: DayType): string {
  if (dayType === 'weekend') return 'Check your children\'s weekly progress summary';
  switch (tod) {
    case 'early_morning': return 'Your children\'s schedules are ready for today';
    case 'morning': return 'Classes are in session — all systems green';
    case 'midday': return 'Midday update: see how your kids are progressing';
    case 'afternoon': return 'After-school activities and homework coming up';
    case 'evening': return 'Review today\'s achievements and messages from teachers';
    case 'night': return 'Tomorrow\'s schedule is set — rest easy';
  }
}

function getParentInsights(): QuickInsight[] {
  return [
    { id: 'children-active', icon: 'Users', label: 'Children', value: '2 active', urgency: 'low', href: '/parent/children' },
    { id: 'messages', icon: 'MessageSquare', label: 'New Messages', value: 3, urgency: 'high', href: '/parent/messages' },
    { id: 'upcoming-events', icon: 'Calendar', label: 'Events This Week', value: 4, urgency: 'low', href: '/parent/calendar' },
    { id: 'progress', icon: 'TrendingUp', label: 'Weekly Progress', value: '+12%', urgency: 'low', href: '/parent/progress' },
  ];
}

function getParentContinuations(): ContinuationItem[] {
  return [
    { id: 'pc1', title: 'Emma\'s Maths Progress', subtitle: 'Fractions unit — needs attention', progress: 45, href: '/parent/children/emma', lastActivity: 'Today' },
    { id: 'pc2', title: 'Jack\'s Reading Journey', subtitle: 'On track for Level 5 by term end', progress: 78, href: '/parent/children/jack', lastActivity: 'Today' },
  ];
}

// =============================================================================
// TUTOR INTELLIGENCE
// =============================================================================

function getTutorFocusHint(tod: TimeOfDay): string {
  switch (tod) {
    case 'early_morning': return 'Review today\'s session schedule and student notes';
    case 'morning': return 'First sessions starting — preparation materials are ready';
    case 'midday': return 'Great time to review session recordings and update plans';
    case 'afternoon': return 'Peak tutoring hours — your next student is waiting';
    case 'evening': return 'Evening sessions wrapping up — log your notes';
    case 'night': return 'All sessions complete — your earnings summary is updated';
  }
}

function getTutorInsights(): QuickInsight[] {
  return [
    { id: 'sessions-today', icon: 'Calendar', label: 'Sessions Today', value: 4, urgency: 'medium', href: '/tutoring/sessions' },
    { id: 'earnings-week', icon: 'CreditCard', label: 'This Week', value: '$420', change: 15, urgency: 'low', href: '/tutoring/earnings' },
    { id: 'rating', icon: 'Star', label: 'Rating', value: '4.9', urgency: 'low', href: '/tutoring/reviews' },
    { id: 'pending-requests', icon: 'Clock', label: 'Booking Requests', value: 2, urgency: 'high', href: '/tutoring/sessions' },
  ];
}

// =============================================================================
// ADMIN INTELLIGENCE
// =============================================================================

function getAdminFocusHint(tod: TimeOfDay): string {
  switch (tod) {
    case 'early_morning': return 'System health check — all services operational';
    case 'morning': return 'Peak usage hours — monitor platform performance';
    case 'midday': return 'Usage analytics updated — review engagement metrics';
    case 'afternoon': return 'Afternoon admin tasks — approvals and compliance';
    case 'evening': return 'End-of-day summary — key metrics at a glance';
    case 'night': return 'Scheduled maintenance window available';
  }
}

function getAdminInsights(): QuickInsight[] {
  return [
    { id: 'active-users', icon: 'Users', label: 'Active Users', value: '1,247', change: 8, urgency: 'low', href: '/admin/users' },
    { id: 'system-health', icon: 'Activity', label: 'System Health', value: '99.8%', urgency: 'low' },
    { id: 'pending-approvals', icon: 'Shield', label: 'Pending Approvals', value: 7, urgency: 'high', href: '/admin/users' },
    { id: 'revenue-today', icon: 'CreditCard', label: 'Revenue Today', value: '$3,420', change: 12, urgency: 'low', href: '/admin/payments' },
  ];
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useDashboardIntelligence(): DashboardIntelligence {
  const { user } = useAuthStore();

  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const tod = getTimeOfDay(hour);
    const dayType: DayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
    const role = user?.role || 'learner';

    // Build time context per role
    let focusHint: string;
    let insights: QuickInsight[];
    let continuations: ContinuationItem[];
    let upcoming: UpcomingEvent[];
    let suggestions: ActionSuggestion[];

    switch (role) {
      case 'teacher':
      case 'educator':
        focusHint = getTeacherFocusHint(tod, dayType);
        insights = getTeacherInsights(tod);
        continuations = getTeacherContinuations();
        upcoming = getTeacherUpcoming(tod);
        suggestions = getTeacherSuggestions(tod);
        break;
      case 'parent':
      case 'guardian':
        focusHint = getParentFocusHint(tod, dayType);
        insights = getParentInsights();
        continuations = getParentContinuations();
        upcoming = [];
        suggestions = [];
        break;
      case 'tutor':
      case 'tutor_professional':
        focusHint = getTutorFocusHint(tod);
        insights = getTutorInsights();
        continuations = [];
        upcoming = [];
        suggestions = [];
        break;
      case 'platform_admin':
      case 'admin':
        focusHint = getAdminFocusHint(tod);
        insights = getAdminInsights();
        continuations = [];
        upcoming = [];
        suggestions = [];
        break;
      default: // learner
        focusHint = getLearnerFocusHint(tod, dayType);
        insights = getLearnerInsights();
        continuations = getLearnerContinuations();
        upcoming = [];
        suggestions = [];
    }

    return {
      time: {
        timeOfDay: tod,
        dayType,
        hour,
        greeting: getGreeting(hour, user?.firstName),
        focusHint,
      },
      insights,
      continuations,
      upcoming,
      suggestions,
    };
  }, [user]);
}
