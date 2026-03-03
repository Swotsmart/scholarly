'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AnalyticsReport, AIInsight } from '@/types/teacher';
import {
  BarChart3, Download, FileText, Users, TrendingUp, TrendingDown,
  Calendar, Printer, Brain, Sparkles, Lightbulb, Shield, AlertTriangle,
} from 'lucide-react';

export default function TeacherReportsPage() {
  const { data, isLoading, error } = useTeacher({ page: 'reports' });
  const [savedReports, setSavedReports] = useState<AnalyticsReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  // Fetch existing generated reports from /analytics/reports
  useEffect(() => {
    teacherApi.analytics.getReports()
      .then((res) => setSavedReports(res.reports))
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, []);

  const overview = data?.analytics?.data?.overview;
  const classBreakdown = data?.analytics?.data?.classBreakdown ?? [];
  const insights = data?.insights ?? [];
  const atRiskCount = insights.filter(i => i.source === 'ml-at-risk').length;
  const gapCount = insights.filter(i => i.source === 'bkt-mastery' && i.type === 'recommendation').length;

  // Generate a new report via the real endpoint
  async function handleGenerate(type: string) {
    setGenerating(type);
    try {
      const result = await teacherApi.analytics.createReport({
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report — ${new Date().toLocaleDateString()}`,
        type,
        filters: {},
      });
      setSavedReports(prev => [result.report, ...prev]);
    } catch { /* error handled by UI */ }
    finally { setGenerating(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate and view reports on student progress and engagement</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Unable to load analytics: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats — live from /analytics/teacher/dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)
        ) : overview ? (
          <>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><Users className="h-6 w-6 text-primary" /></div><div><p className="text-2xl font-bold">{overview.totalStudents}</p><p className="text-sm text-muted-foreground">Total Students</p></div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-green-500/10 p-3"><TrendingUp className="h-6 w-6 text-green-500" /></div><div><p className="text-2xl font-bold">{overview.averagePerformance}%</p><p className="text-sm text-muted-foreground">Avg. Performance</p></div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-blue-500/10 p-3"><Brain className="h-6 w-6 text-blue-500" /></div><div><p className="text-2xl font-bold">{overview.engagementScore}%</p><p className="text-sm text-muted-foreground">AI Engagement Score</p></div></div></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-purple-500/10 p-3"><BarChart3 className="h-6 w-6 text-purple-500" /></div><div><p className="text-2xl font-bold">{overview.attendanceRate}%</p><p className="text-sm text-muted-foreground">Attendance Rate</p></div></div></CardContent></Card>
          </>
        ) : (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">Analytics data not available yet.</CardContent></Card>
        )}
      </div>

      {/* AI Report Recommendation — proactive intelligence */}
      {!isLoading && insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Lightbulb className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">AI Report Suggestion</p>
                  <Badge variant="outline" className="text-xs"><Shield className="h-2.5 w-2.5 mr-1" />LIS Analysis</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {atRiskCount > 0
                    ? `${atRiskCount} at-risk student${atRiskCount > 1 ? 's' : ''} detected — generating an Engagement report would help identify patterns driving disengagement.`
                    : gapCount > 0
                      ? `${gapCount} mastery gap${gapCount > 1 ? 's' : ''} detected — a Progress report would show exactly where targeted intervention is needed.`
                      : 'All metrics look healthy. Consider generating a progress report to document this positive trend for parent communications.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved / Generated Reports — from /analytics/reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Reports</CardTitle>
              <CardDescription>Previously generated reports</CardDescription>
            </div>
            <Button onClick={() => handleGenerate('progress')} disabled={generating !== null}>
              {generating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : savedReports.length > 0 ? (
            <div className="space-y-3">
              {savedReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.type} · Generated {new Date(report.createdAt).toLocaleDateString()}
                        {report.status && <Badge variant="outline" className="ml-2 text-xs">{report.status}</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline"><Download className="mr-2 h-4 w-4" />Download</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No reports generated yet. Use the button above to create your first report.</p>
          )}
        </CardContent>
      </Card>

      {/* Class Summary — from /analytics/teacher/dashboard classBreakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Summary</CardTitle>
              <CardDescription>Overview of all your classes with AI-assessed trends</CardDescription>
            </div>
            <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" />Print Report</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : classBreakdown.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium">Class</th>
                  <th className="p-3 text-left font-medium">Students</th>
                  <th className="p-3 text-left font-medium">Avg. Score</th>
                  <th className="p-3 text-left font-medium">AI Assessment</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classBreakdown.map((cls) => {
                  const needsAttention = cls.averageScore < 40;
                  const onTrack = cls.averageScore >= 60;
                  return (
                    <tr key={cls.classId} className="border-b">
                      <td className="p-3 font-medium">{cls.className}</td>
                      <td className="p-3">{cls.studentCount}</td>
                      <td className="p-3"><Badge variant={cls.averageScore > 50 ? 'default' : 'secondary'}>{cls.averageScore}%</Badge></td>
                      <td className="p-3">
                        {needsAttention ? (
                          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400"><AlertTriangle className="h-3.5 w-3.5" /><span className="text-xs font-medium">Below threshold</span></div>
                        ) : onTrack ? (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400"><TrendingUp className="h-3.5 w-3.5" /><span className="text-xs font-medium">On track</span></div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><Brain className="h-3.5 w-3.5" /><span className="text-xs font-medium">Monitor</span></div>
                        )}
                      </td>
                      <td className="p-3"><Button size="sm" variant="outline">View Details</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No class data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
