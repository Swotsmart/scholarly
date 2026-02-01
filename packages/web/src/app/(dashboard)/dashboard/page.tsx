'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader, StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Flame,
  Target,
  Trophy,
  Star,
  Zap,
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageCircle,
  ChevronRight,
  Award,
  TrendingUp,
  Brain,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';

// Helper function to get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Mock data for demonstration
const userData = {
  streak: 12,
  dailyGoal: 75,
  xp: 2450,
  level: 8,
  xpToNextLevel: 550,
  totalXpForLevel: 1000,
  badges: [
    { id: 'b1', name: 'Quick Learner', icon: Zap },
    { id: 'b2', name: 'Streak Master', icon: Flame },
    { id: 'b3', name: 'Problem Solver', icon: Brain },
  ],
};

const continueLearning = [
  {
    id: 'cl1',
    title: 'Introduction to Design Thinking',
    subject: 'Design',
    progress: 65,
    lastActivity: '2 hours ago',
    nextLesson: 'Ideation Techniques',
    image: '/course-design.jpg',
  },
  {
    id: 'cl2',
    title: 'Algebra Fundamentals',
    subject: 'Mathematics',
    progress: 40,
    lastActivity: 'Yesterday',
    nextLesson: 'Quadratic Equations',
    image: '/course-math.jpg',
  },
];

const todaysTasks = [
  { id: 't1', title: 'Design Challenge Review', type: 'assignment', dueTime: '2:00 PM', urgent: true },
  { id: 't2', title: 'Math Tutoring Session', type: 'session', dueTime: '4:30 PM', urgent: false },
  { id: 't3', title: 'Science Lab Report', type: 'assignment', dueTime: 'Tomorrow', urgent: false },
];

const subjectMastery = [
  { subject: 'Mathematics', mastery: 78, color: 'bg-blue-500' },
  { subject: 'Science', mastery: 85, color: 'bg-green-500' },
  { subject: 'English', mastery: 92, color: 'bg-purple-500' },
  { subject: 'Design', mastery: 65, color: 'bg-orange-500' },
];

const recommendations = [
  {
    id: 'r1',
    title: 'Try 3D Modeling',
    description: 'Based on your design interest, you might enjoy our 3D modeling course.',
    type: 'course',
  },
  {
    id: 'r2',
    title: 'Math Challenge',
    description: 'Test your algebra skills with this weekly challenge!',
    type: 'challenge',
  },
];

const weekCalendar = [
  { day: 'Mon', date: 27, hasEvent: true, isToday: false },
  { day: 'Tue', date: 28, hasEvent: false, isToday: false },
  { day: 'Wed', date: 29, hasEvent: true, isToday: true },
  { day: 'Thu', date: 30, hasEvent: false, isToday: false },
  { day: 'Fri', date: 31, hasEvent: true, isToday: false },
  { day: 'Sat', date: 1, hasEvent: false, isToday: false },
  { day: 'Sun', date: 2, hasEvent: false, isToday: false },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const greeting = useMemo(() => getGreeting(), []);
  const xpProgress = (userData.xpToNextLevel / userData.totalXpForLevel) * 100;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white shadow-lg">
              <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
              <AvatarFallback className="text-lg font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {greeting}, {user?.firstName}!
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your learning journey?
              </p>
            </div>
          </div>

          {/* Streak and Daily Goal */}
          <div className="flex items-center gap-6">
            {/* Streak Counter */}
            <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-3">
              <Flame className="h-6 w-6 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{userData.streak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>

            {/* Daily Goal */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Goal</span>
                <span className="font-semibold">{userData.dailyGoal}%</span>
              </div>
              <div className="relative h-2 w-32 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${userData.dailyGoal}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid with Gamification */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* XP & Level Card */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                Level {userData.level}
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{userData.xp.toLocaleString()} XP</p>
              <div className="mt-2 flex items-center gap-2">
                <Progress value={xpProgress} className="h-2" indicatorClassName="bg-gradient-to-r from-yellow-400 to-orange-500" />
                <span className="text-xs text-muted-foreground">{userData.xpToNextLevel} to go</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatsCard
          label="Courses In Progress"
          value={2}
          icon={BookOpen}
          variant="primary"
          change={15}
        />

        <StatsCard
          label="Tasks Completed"
          value={24}
          icon={CheckCircle2}
          variant="success"
          subtitle="This week"
        />

        <StatsCard
          label="Learning Streak"
          value={`${userData.streak} days`}
          icon={Trophy}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Continue Learning - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Continue Learning</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/learning">
                View All <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {continueLearning.map((course) => (
              <Card key={course.id} hover className="group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {course.subject}
                      </Badge>
                      <h3 className="font-semibold leading-tight truncate">{course.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last activity: {course.lastActivity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                  </div>

                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="text-sm">Next: {course.nextLesson}</span>
                  </div>

                  <Button className="mt-4 w-full group-hover:bg-primary/90" asChild>
                    <Link href={`/learning/courses/${course.id}`}>
                      Resume <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Today's Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today&apos;s Tasks</CardTitle>
              <Badge variant="secondary">{todaysTasks.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {task.urgent ? (
                  <AlertCircle className="h-5 w-5 text-orange-500 shrink-0" />
                ) : task.type === 'session' ? (
                  <Calendar className="h-5 w-5 text-blue-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {task.dueTime}</p>
                </div>
                <Button size="sm" variant="ghost">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2" asChild>
              <Link href="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview & Recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Mastery Rings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Progress Overview
            </CardTitle>
            <CardDescription>Your mastery across subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {subjectMastery.map((subject) => (
                <div key={subject.subject} className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="relative h-14 w-14">
                    <svg className="h-14 w-14 -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        className="text-muted/30"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        strokeDasharray={`${subject.mastery * 1.51} 151`}
                        strokeLinecap="round"
                        className={subject.color.replace('bg-', 'text-')}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                      {subject.mastery}%
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{subject.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.mastery >= 80 ? 'Excellent' : subject.mastery >= 60 ? 'Good' : 'Improving'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Badges Earned */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Recent Badges</h4>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/achievements">View All</Link>
                </Button>
              </div>
              <div className="flex gap-2">
                {userData.badges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-3 py-1.5"
                    >
                      <Icon className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs font-medium">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations from Curiosity Engine */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommended For You
            </CardTitle>
            <CardDescription>Personalized suggestions from our Curiosity Engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="group flex items-start gap-4 rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium group-hover:text-primary">{rec.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Button size="sm" variant="ghost" className="shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" className="w-full" asChild>
              <Link href="/golden-path/curiosity">
                Explore More Recommendations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week
              </CardTitle>
              <CardDescription>Your upcoming schedule</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/calendar">Full Calendar</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-2">
            {weekCalendar.map((day) => (
              <div
                key={day.day}
                className={`flex flex-1 flex-col items-center rounded-lg p-3 transition-colors ${
                  day.isToday
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <span className={`text-xs ${day.isToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {day.day}
                </span>
                <span className="text-lg font-semibold">{day.date}</span>
                {day.hasEvent && (
                  <span
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      day.isToday ? 'bg-primary-foreground' : 'bg-primary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Buddy Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
          asChild
        >
          <Link href="/ai-buddy">
            <MessageCircle className="h-6 w-6" />
            <span className="sr-only">Chat with AI Buddy</span>
          </Link>
        </Button>
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
          1
        </span>
      </div>
    </div>
  );
}
