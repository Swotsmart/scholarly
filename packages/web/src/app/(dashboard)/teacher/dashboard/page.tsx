'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Lightbulb,
  ClipboardCheck,
  Calendar,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';

const stats = [
  { label: 'Active Students', value: '127', change: '+12', icon: Users },
  { label: 'Active Challenges', value: '4', icon: Lightbulb },
  { label: 'Pending Reviews', value: '23', urgent: true, icon: ClipboardCheck },
  { label: 'Evaluations Due', value: '8', icon: FileText },
];

const activeJourneys = [
  { id: 'j1', student: 'Emma Smith', challenge: 'Sustainable Campus', phase: 'prototype', progress: 62 },
  { id: 'j2', student: 'Liam Johnson', challenge: 'Sustainable Campus', phase: 'ideate', progress: 45 },
  { id: 'j3', student: 'Olivia Brown', challenge: 'Student Wellness', phase: 'empathize', progress: 20 },
  { id: 'j4', student: 'Noah Williams', challenge: 'Student Wellness', phase: 'define', progress: 35 },
];

const upcomingClasses = [
  { id: 'c1', name: 'Year 10 Design & Tech', time: '9:00 AM', room: 'Room 204', students: 28 },
  { id: 'c2', name: 'Year 11 Innovation', time: '11:30 AM', room: 'Lab 3', students: 24 },
  { id: 'c3', name: 'Year 12 Project', time: '2:00 PM', room: 'Room 312', students: 18 },
];

const pendingActions = [
  { type: 'review', title: '5 peer reviews awaiting moderation', urgent: true },
  { type: 'grade', title: '3 pitch decks ready for evaluation', urgent: false },
  { type: 'feedback', title: '2 students requested feedback', urgent: true },
];

export default function TeacherDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, Dr. Wilson. Here's your overview for today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/teacher/scheduling/timetable">
              <Calendar className="mr-2 h-4 w-4" />
              View Timetable
            </Link>
          </Button>
          <Button asChild>
            <Link href="/teacher/challenges/create">
              <Lightbulb className="mr-2 h-4 w-4" />
              Create Challenge
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  {stat.urgent && (
                    <Badge variant="destructive">Action Needed</Badge>
                  )}
                  {stat.change && (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {action.urgent ? (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">{action.title}</span>
                </div>
                <Button size="sm" variant="outline">
                  View
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Classes</CardTitle>
                <CardDescription>Your schedule for today</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/scheduling/timetable">Full Schedule</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingClasses.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cls.room} • {cls.students} students
                  </p>
                </div>
                <Badge variant="outline">{cls.time}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Student Journeys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Student Journeys</CardTitle>
              <CardDescription>Track student progress on design challenges</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/teacher/journeys">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeJourneys.map((journey) => (
              <div
                key={journey.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{journey.student}</p>
                    <Badge variant="secondary" className="capitalize">
                      {journey.phase}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{journey.challenge}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={journey.progress} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{journey.progress}%</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href={`/teacher/journeys/${journey.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
