'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReorderablePanels } from '@/components/dashboard/draggable-panel';
import { useTeacherDashboardLayout, type TeacherPanelId } from '@/stores/dashboard-layout-store';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AIInsight, Session, ActivityItem, Notification } from '@/types/teacher';
import {
  Users, Clock, Calendar, BookOpen, AlertTriangle, CheckCircle2, ArrowRight,
  ChevronRight, ClipboardCheck, FileText, Lightbulb, MessageCircle, TrendingUp,
  TrendingDown, AlertCircle, Play, GraduationCap, Brain, Sparkles, PlusCircle,
  ClipboardList, PenLine, Bot, Send, Heart, Shield,
} from 'lucide-react';

// =============================================================================
// Helpers (pure functions, no data)
// =============================================================================

function getCurrentPeriod(): { period: string; remaining: string } {
  const hour = new Date().getHours();
  if (hour < 9) return { period: 'Before School', remaining: '' };
  if (hour < 10) return { period: 'Period 1', remaining: '25 min remaining' };
  if (hour < 11) return { period: 'Period 2', remaining: '45 min remaining' };
  if (hour < 12) return { period: 'Period 3', remaining: '15 min remaining' };
  if (hour < 13) return { period: 'Lunch', remaining: '' };
  if (hour < 14) return { period: 'Period 4', remaining: '30 min remaining' };
  if (hour < 15) return { period: 'Period 5', remaining: '50 min remaining' };
  return { period: 'After School', remaining: '' };
}

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function insightIcon(insight: AIInsight) {
  switch (insight.type) {
    case 'alert': return AlertTriangle;
    case 'celebration': return Heart;
    case 'recommendation': return Lightbulb;
    case 'suggestion': return Sparkles;
    default: return Brain;
  }
}

function insightColors(insight: AIInsight) {
  switch (insight.severity) {
    case 'critical': return 'bg-red-500/10 text-red-500';
    case 'warning': return 'bg-orange-500/10 text-orange-500';
    case 'positive': return 'bg-green-500/10 text-green-500';
    default: return 'bg-blue-500/10 text-blue-500';
  }
}

// =============================================================================
// Panel sub-components — all powered by live API data, zero hardcoded content
// =============================================================================

function QuickActionsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
            <Link href="/teacher/attendance"><ClipboardList className="h-6 w-6 text-blue-500" /><span>Take Attendance</span></Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
            <Link href="/teacher/lessons/new"><PlusCircle className="h-6 w-6 text-green-500" /><span>Create Lesson Plan</span></Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
            <Link href="/teacher/grading"><PenLine className="h-6 w-6 text-orange-500" /><span>Grade Work</span></Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
            <Link href="/teacher/challenges/create"><Lightbulb className="h-6 w-6 text-purple-500" /><span>New Challenge</span></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsGridPanel({ data, isLoading }: { data: ReturnType<typeof useTeacher>['data']; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
      </div>
    );
  }

  const overview = data?.analytics?.data?.overview;
  const platformStats = data?.platformStats?.stats;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard label="Total Students" value={overview?.totalStudents ?? 0} icon={Users} variant="primary" />
      <StatsCard label="Avg. Performance" value={`${overview?.averagePerformance ?? 0}%`} icon={TrendingUp} variant="primary" />
      <StatsCard label="AI Engagement Score" value={`${overview?.engagementScore ?? 0}%`} icon={Brain} variant="primary" subtitle={`${overview?.attendanceRate ?? 0}% attendance`} />
      <StatsCard label="Today's Bookings" value={platformStats?.todayBookings ?? 0} icon={Calendar} variant="warning" subtitle={`${platformStats?.activeTutors ?? 0} active tutors`} />
    </div>
  );
}

function MainContentPanel({ data, isLoading }: { data: ReturnType<typeof useTeacher>['data']; isLoading: boolean }) {
  const sessions = data?.upcomingSessions ?? [];
  const classBreakdown = data?.analytics?.data?.classBreakdown ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Classes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/classes">View All <ChevronRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <Card key={i}><CardContent className="p-5"><Skeleton className="h-32 w-full" /></CardContent></Card>)
          ) : classBreakdown.length > 0 ? (
            classBreakdown.map((cls) => (
              <Card key={cls.classId} className="group">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                    <GraduationCap className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="mt-3 font-semibold">{cls.className}</h3>
                  <p className="text-sm text-muted-foreground">{cls.studentCount} students</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Average Score</span>
                      <span className="font-medium">{cls.averageScore}%</span>
                    </div>
                    <Progress value={cls.averageScore} className="h-2" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/teacher/classes/${cls.classId}`}>View Class</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No class data available yet. Analytics will populate as students interact with the platform.</CardContent></Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/teacher/scheduling/timetable">Full View</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
          ) : sessions.length > 0 ? (
            sessions.slice(0, 5).map((session) => {
              const isToday = new Date(session.scheduledStart).toDateString() === new Date().toDateString();
              const time = new Date(session.scheduledStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const date = isToday ? 'Today' : new Date(session.scheduledStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={session.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><BookOpen className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.participants.map(p => p.learnerProfile.user.displayName).join(', ') || 'Session'}</p>
                    <p className="text-xs text-muted-foreground">{date} at {time}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">{session.status}</Badge>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming sessions scheduled.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AtRiskHelpPanel({ insights, isLoading }: { insights: AIInsight[]; isLoading: boolean }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    teacherApi.dashboard.getNotifications().then((res) => setNotifications(res.notifications)).catch(() => {});
  }, []);

  const atRiskInsights = insights.filter(i => i.source === 'ml-at-risk');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /><CardTitle>At-Risk Students</CardTitle></div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs"><Brain className="h-3 w-3 mr-1" />AI-detected</Badge>
              {atRiskInsights.length > 0 && <Badge variant="destructive">{atRiskInsights.length} flagged</Badge>}
            </div>
          </div>
          <CardDescription>ML models continuously monitor engagement, performance, and attendance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (<div key={i} className="flex items-center gap-4 rounded-lg border p-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div></div>))
          ) : atRiskInsights.length > 0 ? (
            atRiskInsights.map((insight) => (
              <div key={insight.id} className="flex items-center gap-4 rounded-lg border p-4 transition-all hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30"><AlertTriangle className="h-5 w-5 text-orange-500" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{insight.title}</p>
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">{insight.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{Math.round(insight.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                </div>
                {insight.actionHref && (<Button size="sm" variant="outline" asChild><Link href={insight.actionHref}>{insight.actionLabel || 'View'}</Link></Button>)}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No at-risk students detected. All learners progressing within expected parameters.</p>
          )}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/teacher/students/at-risk">View All At-Risk Students<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-blue-500" /><CardTitle>Notifications</CardTitle></div>
            <Badge variant="secondary">{notifications.filter(n => !n.read).length} unread</Badge>
          </div>
          <CardDescription>Recent alerts and messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length > 0 ? (
            notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className={`flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${!notif.read ? 'border-blue-200 dark:border-blue-800' : ''}`}>
                {!notif.read && <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notif.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No notifications.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UpcomingAiPanel({ insights, isLoading }: { insights: AIInsight[]; isLoading: boolean }) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    teacherApi.dashboard.getActivity().then((res) => setActivity(res.activities)).catch(() => {});
  }, []);

  const displayInsights = insights.filter(i => i.source !== 'ml-at-risk' && !dismissedIds.has(i.id));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Recent Activity</CardTitle>
          <CardDescription>Your teaching activity feed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length > 0 ? (
            activity.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><FileText className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity recorded.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />AI Insights</CardTitle>
          <CardDescription>Real-time intelligence from BKT mastery tracking, ML risk detection, and learning analytics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="rounded-lg border p-4 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" /></div>)
          ) : displayInsights.length > 0 ? (
            displayInsights.map((insight) => {
              const Icon = insightIcon(insight);
              const colors = insightColors(insight);
              return (
                <div key={insight.id} className="group rounded-lg border p-4 transition-all hover:border-purple-500/30 hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        {insight.confidence > 0 && (<Badge variant="outline" className="text-xs"><Shield className="h-2.5 w-2.5 mr-1" />{Math.round(insight.confidence * 100)}%</Badge>)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">Source: {insight.source.replace(/-/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {insight.actionHref ? (
                      <Button size="sm" variant="outline" className="flex-1" asChild><Link href={insight.actionHref}>{insight.actionLabel || 'Take Action'}</Link></Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1" asChild><Link href="/teacher/students">{insight.actionLabel || 'Take Action'}</Link></Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => {
                      setDismissedIds(prev => new Set(prev).add(insight.id));
                    }}>Dismiss</Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No AI insights available yet. Insights appear as students interact with the platform and the LIS accumulates data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Ask Issy — contextual AI assistant, calls /api/v1/ask-issy/message
// =============================================================================

function AskIssyPanel() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  async function handleAsk() {
    if (!message.trim()) return;
    setIsThinking(true);
    setResponse(null);
    try {
      const result = await teacherApi.ai.askIssy(message);
      setResponse(result.data.message.content);
    } catch {
      setResponse('Unable to reach the AI assistant. Please try again.');
    } finally {
      setIsThinking(false);
      setMessage('');
    }
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />Ask Issy</CardTitle>
        <CardDescription>Your AI teaching assistant — ask about student progress, lesson ideas, or anything on this page</CardDescription>
      </CardHeader>
      <CardContent>
        {response && (
          <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4">
            <p className="text-sm">{response}</p>
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. Which students need attention this week?"
            className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={isThinking} />
          <Button size="sm" onClick={handleAsk} disabled={isThinking || !message.trim()} className="bg-purple-600 hover:bg-purple-700">
            {isThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          {['Who needs help today?', 'Suggest a lesson for Year 4', 'Show mastery gaps'].map((s) => (
            <button key={s} onClick={() => setMessage(s)} className="text-xs rounded-full border px-3 py-1 text-muted-foreground hover:border-purple-300 hover:text-purple-600 transition-colors">{s}</button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Panel registry — maps IDs to live-data-powered components
// =============================================================================

function createPanelMap(data: ReturnType<typeof useTeacher>['data'], isLoading: boolean): Record<TeacherPanelId, () => JSX.Element> {
  return {
    'quick-actions': () => <QuickActionsPanel />,
    'stats-grid': () => <StatsGridPanel data={data} isLoading={isLoading} />,
    'main-content': () => <MainContentPanel data={data} isLoading={isLoading} />,
    'at-risk-help': () => <AtRiskHelpPanel insights={data?.insights ?? []} isLoading={isLoading} />,
    'upcoming-ai': () => <UpcomingAiPanel insights={data?.insights ?? []} isLoading={isLoading} />,
  };
}

// =============================================================================
// Main page
// =============================================================================

export default function TeacherDashboardPage() {
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const currentTime = useMemo(() => formatCurrentTime(), []);
  const { panelOrder, setPanelOrder } = useTeacherDashboardLayout();
  const { data, isLoading, error } = useTeacher({ page: 'dashboard' });
  const panelMap = useMemo(() => createPanelMap(data, isLoading), [data, isLoading]);

  const currentSession = data?.upcomingSessions?.find(s => {
    const start = new Date(s.scheduledStart);
    const now = new Date();
    return s.status === 'in_progress' || (start <= now && (!s.scheduledEnd || new Date(s.scheduledEnd) >= now));
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-500/5 to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="text-muted-foreground/50">|</span>
              <Clock className="h-4 w-4" />
              <span>{currentTime}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {data?.summary?.user ? `Welcome back. Here's your day at a glance.` : isLoading ? 'Loading your dashboard...' : 'Welcome to Scholarly.'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm border px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10"><Play className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="font-semibold">{currentPeriod.period}</p>
                  {currentPeriod.remaining && <p className="text-sm text-muted-foreground">{currentPeriod.remaining}</p>}
                </div>
              </div>
            </div>
            {currentSession && (
              <div className="rounded-xl bg-blue-500 text-white px-5 py-3 shadow-lg">
                <p className="text-sm font-medium opacity-90">Now Teaching</p>
                <p className="font-semibold">{currentSession.participants.map(p => p.learnerProfile.user.displayName).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">Unable to load dashboard data: {error}. Some sections may be unavailable.</p>
          </CardContent>
        </Card>
      )}

      <AskIssyPanel />
      <ReorderablePanels panelOrder={panelOrder} onReorder={setPanelOrder} panelMap={panelMap} />
    </div>
  );
}
