'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Clock, Target, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const CHILDREN_FALLBACK = [
  {
    id: 'c1',
    name: 'Emma',
    courses: [
      { name: 'Mathematics', progress: 78, hoursThisWeek: 5.5, status: 'on-track' },
      { name: 'English Literature', progress: 85, hoursThisWeek: 4.2, status: 'ahead' },
      { name: 'Science', progress: 62, hoursThisWeek: 3.0, status: 'on-track' },
      { name: 'History', progress: 45, hoursThisWeek: 2.5, status: 'behind' },
    ],
    totalHours: 15.2,
    streak: 12,
  },
  {
    id: 'c2',
    name: 'Oliver',
    courses: [
      { name: 'Reading', progress: 90, hoursThisWeek: 4.0, status: 'ahead' },
      { name: 'Mathematics', progress: 72, hoursThisWeek: 3.5, status: 'on-track' },
      { name: 'Art', progress: 95, hoursThisWeek: 2.0, status: 'ahead' },
    ],
    totalHours: 9.5,
    streak: 8,
  },
];

// ---------------------------------------------------------------------------
// Bridge: API FamilyChild → display shape
// ---------------------------------------------------------------------------
function bridgeLearningChild(child: FamilyChild) {
  const courses: Array<{ name: string; progress: number; hoursThisWeek: number; status: string }> = [];

  if (child.phonicsProgress) {
    const phonicsAvg = ((child.phonicsProgress.blendingAccuracy + child.phonicsProgress.segmentingAccuracy) / 2) * 100;
    const phonicsStatus = phonicsAvg >= 80 ? 'ahead' : phonicsAvg >= 60 ? 'on-track' : 'behind';
    courses.push({
      name: 'Phonics',
      progress: Math.round(phonicsAvg),
      hoursThisWeek: Math.round((child.totalLearningMinutes / child.totalSessions) * 0.6 * 10) / 10 || 0,
      status: phonicsStatus,
    });

    // Sight words / reading as a separate course
    const readingProgress = Math.min(100, Math.round((child.phonicsProgress.sightWordsMastered / 50) * 100));
    courses.push({
      name: 'Reading',
      progress: readingProgress,
      hoursThisWeek: Math.round((child.totalLearningMinutes / child.totalSessions) * 0.2 * 10) / 10 || 0,
      status: readingProgress >= 80 ? 'ahead' : readingProgress >= 40 ? 'on-track' : 'behind',
    });
  }

  if (child.numeracyProgress) {
    const numeracyAvg = ((child.numeracyProgress.subitizingAccuracy +
      child.numeracyProgress.additionAccuracy +
      child.numeracyProgress.subtractionAccuracy) / 3) * 100;
    const numeracyStatus = numeracyAvg >= 80 ? 'ahead' : numeracyAvg >= 60 ? 'on-track' : 'behind';
    courses.push({
      name: 'Numeracy',
      progress: Math.round(numeracyAvg),
      hoursThisWeek: Math.round((child.totalLearningMinutes / child.totalSessions) * 0.2 * 10) / 10 || 0,
      status: numeracyStatus,
    });
  }

  // If no progress data, show a placeholder
  if (courses.length === 0) {
    courses.push({
      name: 'Getting Started',
      progress: 0,
      hoursThisWeek: 0,
      status: 'on-track',
    });
  }

  const totalHours = Math.round((child.totalLearningMinutes / 60) * 10) / 10;

  return {
    id: child.id,
    name: child.preferredName || child.firstName,
    courses,
    totalHours,
    streak: child.currentStreak,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusBadge(status: string) {
  switch (status) {
    case 'ahead':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Ahead</Badge>;
    case 'on-track':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">On Track</Badge>;
    case 'behind':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Needs Attention</Badge>;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentLearningProgressPage() {
  const { family, isLoading } = useParent();

  const CHILDREN = family
    ? family.children.map(bridgeLearningChild)
    : CHILDREN_FALLBACK;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">Track your children's course completion and study time</p>
      </div>

      {CHILDREN.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{child.name}</span>
              <div className="flex items-center gap-4 text-sm font-normal">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {child.totalHours}h total
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-orange-500" />
                  {child.streak} day streak
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {child.courses.map((course) => (
              <div key={course.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{course.name}</span>
                    {getStatusBadge(course.status)}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {course.hoursThisWeek}h this week
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={course.progress} className="flex-1" />
                  <span className="text-sm font-medium w-12 text-right">{course.progress}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
