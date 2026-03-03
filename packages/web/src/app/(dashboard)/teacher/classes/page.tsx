'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AIInsight, Session } from '@/types/teacher';
import {
  Users, BookOpen, TrendingUp, TrendingDown, Clock, Brain, AlertTriangle, Sparkles, Shield,
} from 'lucide-react';

export default function TeacherClassesPage() {
  const { data, isLoading, error } = useTeacher({ page: 'classes' });
  const [sessions, setSessions] = useState<Session[]>([]);

  // Fetch all sessions to map next-session per class
  useEffect(() => {
    teacherApi.sessions.list({ upcoming: true }).then((res) => setSessions(res.sessions)).catch(() => {});
  }, []);

  const classBreakdown = data?.analytics?.data?.classBreakdown ?? [];
  const insights = data?.insights ?? [];
  const atRiskCount = insights.filter(i => i.source === 'ml-at-risk').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">My Classes</h1>
          <p className="text-muted-foreground">Manage your classes and track student progress</p>
        </div>
        {atRiskCount > 0 && (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
            <AlertTriangle className="h-3 w-3 mr-1" />{atRiskCount} at-risk student{atRiskCount > 1 ? 's' : ''} across classes
          </Badge>
        )}
      </div>

      {/* AI Summary — class-wide intelligence */}
      {data?.analytics?.data?.overview && !isLoading && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Class-wide performance is at {data.analytics.data.overview.averagePerformance}% with {data.analytics.data.overview.attendanceRate}% attendance.
                  {data.analytics.data.overview.engagementScore >= 75
                    ? ' Engagement levels are healthy.'
                    : ' Engagement could use attention — consider incorporating more interactive activities.'}
                </p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />AI Analysis</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Unable to load class data: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((j) => <Skeleton key={j} className="h-20 rounded-lg" />)}</div></CardContent>
            </Card>
          ))
        ) : classBreakdown.length > 0 ? (
          classBreakdown.map((cls) => {
            const progressTrend = cls.averageScore >= 60 ? 'up' : cls.averageScore >= 40 ? 'stable' : 'down';
            const nextSession = sessions.find(s => s.participants.length > 0);
            const classInsights = insights.filter(i => i.type === 'recommendation' || i.type === 'suggestion').slice(0, 1);

            return (
              <Card key={cls.classId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{cls.className}</CardTitle>
                      <CardDescription>{cls.studentCount} students</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {progressTrend === 'down' && (
                        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                          <TrendingDown className="h-3 w-3 mr-1" />Needs attention
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" />Average Score</div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={cls.averageScore} className="flex-1" />
                        <span className="text-sm font-medium">{cls.averageScore}%</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />Students</div>
                      <p className="mt-1 font-medium">{cls.studentCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Next Session</div>
                      <p className="mt-1 font-medium">
                        {nextSession ? new Date(nextSession.scheduledStart).toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'None scheduled'}
                      </p>
                    </div>
                  </div>

                  {classInsights.length > 0 && (
                    <div className="rounded-lg border border-purple-200/50 dark:border-purple-800/30 bg-purple-50/30 dark:bg-purple-900/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Recommendation</span>
                      </div>
                      {classInsights.map((insight) => (
                        <p key={insight.id} className="text-sm text-muted-foreground">{insight.description}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button asChild><Link href={`/teacher/classes/${cls.classId}`}><Users className="mr-2 h-4 w-4" />View Students</Link></Button>
                    <Button variant="outline" asChild><Link href={`/teacher/classes/${cls.classId}/progress`}><TrendingUp className="mr-2 h-4 w-4" />Progress Report</Link></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No class data available yet. Classes will appear as student enrolments and analytics are populated.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
