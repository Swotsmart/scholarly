'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users,
  Clock,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Lightbulb,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Play,
  GraduationCap,
  Brain,
  Sparkles,
  PlusCircle,
  ClipboardList,
  PenLine,
} from 'lucide-react';

// Helper function to get current period
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

// Helper function to format time
function formatCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Mock data
const todaySchedule = [
  { id: 's1', name: 'Year 10 Design & Tech', time: '9:00 AM', room: 'Room 204', students: 28, isCurrent: false, isPast: true },
  { id: 's2', name: 'Year 11 Innovation Lab', time: '10:30 AM', room: 'Lab 3', students: 24, isCurrent: true, isPast: false },
  { id: 's3', name: 'Year 12 Project Based Learning', time: '1:00 PM', room: 'Room 312', students: 18, isCurrent: false, isPast: false },
  { id: 's4', name: 'Year 9 Introduction to Design', time: '2:30 PM', room: 'Room 204', students: 30, isCurrent: false, isPast: false },
];

const classCards = [
  {
    id: 'c1',
    name: 'Year 10 Design & Tech',
    students: 28,
    activeAssignments: 3,
    avgProgress: 72,
    nextClass: 'Tomorrow, 9:00 AM',
  },
  {
    id: 'c2',
    name: 'Year 11 Innovation Lab',
    students: 24,
    activeAssignments: 2,
    avgProgress: 85,
    nextClass: 'Now',
  },
  {
    id: 'c3',
    name: 'Year 12 Project Based Learning',
    students: 18,
    activeAssignments: 4,
    avgProgress: 68,
    nextClass: 'Today, 1:00 PM',
  },
];

const atRiskStudents = [
  {
    id: 'ar1',
    name: 'James Chen',
    avatar: null,
    class: 'Year 10 Design & Tech',
    issue: 'Missed 3 assignments',
    riskLevel: 'high',
    trend: 'down',
  },
  {
    id: 'ar2',
    name: 'Sophie Williams',
    avatar: null,
    class: 'Year 11 Innovation',
    issue: 'Engagement dropped 40%',
    riskLevel: 'medium',
    trend: 'down',
  },
  {
    id: 'ar3',
    name: 'Michael Brown',
    avatar: null,
    class: 'Year 12 PBL',
    issue: 'Behind on project milestones',
    riskLevel: 'medium',
    trend: 'stable',
  },
];

const pendingHelpRequests = [
  { id: 'hr1', student: 'Emma Thompson', topic: 'Prototype feedback needed', time: '15 min ago', urgent: true },
  { id: 'hr2', student: 'Liam Davis', topic: 'Question about pitch deck', time: '1 hour ago', urgent: false },
  { id: 'hr3', student: 'Olivia Martinez', topic: 'Review my design brief', time: '2 hours ago', urgent: false },
];

const upcomingItems = [
  { id: 'u1', type: 'lesson', title: 'Year 12 PBL - Iteration Phase', time: '1:00 PM', icon: BookOpen },
  { id: 'u2', type: 'grading', title: '12 pitch decks to grade', time: 'Today', icon: ClipboardCheck },
  { id: 'u3', type: 'meeting', title: 'Parent-Teacher Conference', time: '4:30 PM', icon: Users },
  { id: 'u4', type: 'lesson', title: 'Year 9 Design Introduction', time: '2:30 PM', icon: BookOpen },
];

const aiInsights = [
  {
    id: 'ai1',
    title: 'Year 10 struggling with prototyping',
    description: 'Consider a mini-workshop on low-fidelity prototyping techniques',
    type: 'intervention',
    priority: 'high',
  },
  {
    id: 'ai2',
    title: 'High engagement in peer review',
    description: "Students are 40% more engaged when doing collaborative reviews. Consider more group activities.",
    type: 'insight',
    priority: 'medium',
  },
  {
    id: 'ai3',
    title: 'Differentiation opportunity',
    description: '5 students in Year 11 are ready for advanced challenges',
    type: 'opportunity',
    priority: 'low',
  },
];

export default function TeacherDashboardPage() {
  const currentPeriod = useMemo(() => getCurrentPeriod(), []);
  const currentTime = useMemo(() => formatCurrentTime(), []);
  const currentClass = todaySchedule.find(c => c.isCurrent);

  return (
    <div className="space-y-8">
      {/* Hero Section - Today's Overview */}
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
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Teacher Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, Dr. Wilson. Here&apos;s your day at a glance.
            </p>
          </div>

          {/* Current Period Indicator */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/80 dark:bg-gray-800/80 shadow-sm border px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                  <Play className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold">{currentPeriod.period}</p>
                  {currentPeriod.remaining && (
                    <p className="text-sm text-muted-foreground">{currentPeriod.remaining}</p>
                  )}
                </div>
              </div>
            </div>

            {currentClass && (
              <div className="rounded-xl bg-blue-500 text-white px-5 py-3 shadow-lg">
                <p className="text-sm font-medium opacity-90">Now Teaching</p>
                <p className="font-semibold">{currentClass.name}</p>
                <p className="text-sm opacity-80">{currentClass.room} - {currentClass.students} students</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Active Students"
          value={127}
          icon={Users}
          variant="primary"
          change={12}
        />

        <StatsCard
          label="Pending Reviews"
          value={23}
          icon={ClipboardCheck}
          variant="warning"
          subtitle="8 urgent"
        />

        <StatsCard
          label="Help Requests"
          value={pendingHelpRequests.length}
          icon={MessageCircle}
          variant="error"
          subtitle="1 urgent"
        />

        <StatsCard
          label="Assessments Due"
          value={12}
          icon={FileText}
          variant="primary"
          subtitle="This week"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Class Overview - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Classes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/teacher/classes">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classCards.map((cls) => (
              <Card key={cls.id} hover className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <GraduationCap className="h-5 w-5 text-blue-500" />
                    </div>
                    {cls.nextClass === 'Now' && (
                      <Badge className="bg-green-500 text-white">Live</Badge>
                    )}
                  </div>

                  <h3 className="mt-3 font-semibold">{cls.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cls.students} students - {cls.activeAssignments} active assignments
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Class Progress</span>
                      <span className="font-medium">{cls.avgProgress}%</span>
                    </div>
                    <Progress value={cls.avgProgress} className="h-2" />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{cls.nextClass}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/teacher/classes/${cls.id}`}>View Class</Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/teacher/attendance/${cls.id}`}>
                        <ClipboardList className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Schedule</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/teacher/scheduling/timetable">Full View</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySchedule.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  item.isCurrent
                    ? 'border-blue-500 bg-blue-500/5'
                    : item.isPast
                      ? 'opacity-60'
                      : 'hover:bg-muted/50'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  item.isCurrent ? 'bg-blue-500 text-white' : 'bg-muted'
                }`}>
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.time} - {item.room}
                  </p>
                </div>
                {item.isCurrent && (
                  <Badge className="bg-blue-500 text-white shrink-0">Now</Badge>
                )}
                {item.isPast && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students & Help Requests */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>At-Risk Students</CardTitle>
              </div>
              <Badge variant="destructive">{atRiskStudents.length} flagged</Badge>
            </div>
            <CardDescription>AI-identified students who may need support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {atRiskStudents.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-all hover:shadow-sm"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={student.avatar || undefined} />
                  <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{student.name}</p>
                    <Badge
                      variant="outline"
                      className={
                        student.riskLevel === 'high'
                          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                      }
                    >
                      {student.riskLevel} risk
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{student.class}</p>
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    {student.trend === 'down' ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-gray-400" />
                    )}
                    <span className="text-muted-foreground">{student.issue}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  View Profile
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/teacher/students/at-risk">
                View All At-Risk Students
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Pending Help Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <CardTitle>Help Requests</CardTitle>
              </div>
              <Badge variant="secondary">{pendingHelpRequests.length} pending</Badge>
            </div>
            <CardDescription>Students waiting for your assistance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingHelpRequests.map((request) => (
              <div
                key={request.id}
                className={`flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                  request.urgent ? 'border-orange-200 dark:border-orange-800' : ''
                }`}
              >
                {request.urgent && (
                  <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{request.student}</p>
                  <p className="text-sm text-muted-foreground truncate">{request.topic}</p>
                  <p className="text-xs text-muted-foreground">{request.time}</p>
                </div>
                <Button size="sm">Respond</Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/teacher/help-requests">View All Requests</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming
            </CardTitle>
            <CardDescription>Lessons, assessments, and meetings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    item.type === 'lesson'
                      ? 'bg-blue-500/10 text-blue-500'
                      : item.type === 'grading'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-purple-500/10 text-purple-500'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Insights
            </CardTitle>
            <CardDescription>Suggested interventions and opportunities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className="group rounded-lg border p-4 transition-all hover:border-purple-500/30 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    insight.priority === 'high'
                      ? 'bg-red-500/10 text-red-500'
                      : insight.priority === 'medium'
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'bg-green-500/10 text-green-500'
                  }`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {insight.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Take Action
                  </Button>
                  <Button size="sm" variant="ghost">
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks at your fingertips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/teacher/attendance">
                <ClipboardList className="h-6 w-6 text-blue-500" />
                <span>Take Attendance</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/teacher/lessons/new">
                <PlusCircle className="h-6 w-6 text-green-500" />
                <span>Create Lesson Plan</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/teacher/grading">
                <PenLine className="h-6 w-6 text-orange-500" />
                <span>Grade Work</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/teacher/challenges/create">
                <Lightbulb className="h-6 w-6 text-purple-500" />
                <span>New Challenge</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
