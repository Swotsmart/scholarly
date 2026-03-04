'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BookOpen, Target, Clock, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Bridge: convert API data to subject-like progress display
// ---------------------------------------------------------------------------
function bridgeSubjects(child: FamilyChild) {
  const subjects: Array<{ name: string; progress: number; trend: string; grade: string; color: string }> = [];
  if (child.phonicsProgress) {
    const pp = child.phonicsProgress;
    const blendPct = Math.round(pp.blendingAccuracy * 100);
    const segPct = Math.round(pp.segmentingAccuracy * 100);
    subjects.push({ name: 'Blending', progress: blendPct, trend: blendPct >= 70 ? '+' : '', grade: blendPct >= 85 ? 'A' : blendPct >= 70 ? 'B+' : blendPct >= 50 ? 'B' : 'C', color: 'bg-blue-500' });
    subjects.push({ name: 'Segmenting', progress: segPct, trend: segPct >= 70 ? '+' : '', grade: segPct >= 85 ? 'A' : segPct >= 70 ? 'B+' : segPct >= 50 ? 'B' : 'C', color: 'bg-purple-500' });
    subjects.push({ name: 'Sight Words', progress: Math.min(pp.sightWordsMastered * 5, 100), trend: `${pp.sightWordsMastered} words`, grade: pp.sightWordsMastered >= 20 ? 'A' : pp.sightWordsMastered >= 10 ? 'B+' : 'B', color: 'bg-green-500' });
  }
  if (child.numeracyProgress) {
    const np = child.numeracyProgress;
    subjects.push({ name: 'Subitizing', progress: Math.round(np.subitizingAccuracy * 100), trend: '', grade: np.subitizingAccuracy >= 0.85 ? 'A' : np.subitizingAccuracy >= 0.7 ? 'B+' : 'B', color: 'bg-amber-500' });
    subjects.push({ name: 'Addition', progress: Math.round(np.additionAccuracy * 100), trend: '', grade: np.additionAccuracy >= 0.85 ? 'A' : np.additionAccuracy >= 0.7 ? 'B+' : 'B', color: 'bg-pink-500' });
  }
  return subjects.length > 0 ? subjects : SUBJECTS_FALLBACK;
}

const SUBJECTS_FALLBACK = [
  { name: 'Blending', progress: 82, trend: '+5%', grade: 'A', color: 'bg-blue-500' },
  { name: 'Segmenting', progress: 75, trend: '+3%', grade: 'B+', color: 'bg-purple-500' },
  { name: 'Sight Words', progress: 60, trend: '12 words', grade: 'B', color: 'bg-green-500' },
  { name: 'Subitizing', progress: 70, trend: '', grade: 'B', color: 'bg-amber-500' },
  { name: 'Addition', progress: 55, trend: '', grade: 'B-', color: 'bg-pink-500' },
];

export default function ParentProgressPage() {
  const { family, isLoading } = useParent();

  const firstChild = family?.children[0];
  const SUBJECTS = firstChild ? bridgeSubjects(firstChild) : SUBJECTS_FALLBACK;
  const totalMinutes = firstChild?.totalLearningMinutes ?? 280;
  const totalSessions = firstChild?.totalSessions ?? 18;

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
        <h1 className="text-2xl font-semibold tracking-tight">Progress Overview</h1>
        <p className="text-muted-foreground">
          {firstChild ? `${firstChild.preferredName || firstChild.firstName}'s learning journey` : 'Track your children\'s learning progress'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMinutes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Minutes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
              <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{firstChild?.currentStreak ?? 0}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{firstChild?.totalStars.toLocaleString() ?? '0'}</p>
              <p className="text-xs text-muted-foreground">Stars Earned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skills Breakdown</CardTitle>
          <CardDescription>Performance across different learning areas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SUBJECTS.map((subject) => (
            <div key={subject.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${subject.color}`} />
                  <span className="font-medium text-sm">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {subject.trend && (
                    <span className="text-xs text-muted-foreground">{subject.trend}</span>
                  )}
                  <span className="text-sm font-bold">{subject.grade}</span>
                </div>
              </div>
              <Progress value={subject.progress} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
