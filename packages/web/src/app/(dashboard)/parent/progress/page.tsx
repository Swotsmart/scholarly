'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BookOpen, Target, Clock } from 'lucide-react';

const SUBJECTS = [
  { name: 'Mathematics', progress: 82, trend: '+5%', grade: 'A', color: 'bg-blue-500' },
  { name: 'English', progress: 75, trend: '+3%', grade: 'B+', color: 'bg-purple-500' },
  { name: 'Science', progress: 88, trend: '+8%', grade: 'A', color: 'bg-green-500' },
  { name: 'History', progress: 70, trend: '+2%', grade: 'B', color: 'bg-amber-500' },
  { name: 'Art', progress: 92, trend: '+1%', grade: 'A+', color: 'bg-pink-500' },
];

const WEEKLY_ACTIVITY = [
  { day: 'Mon', minutes: 45, lessons: 3 },
  { day: 'Tue', minutes: 60, lessons: 4 },
  { day: 'Wed', minutes: 30, lessons: 2 },
  { day: 'Thu', minutes: 75, lessons: 5 },
  { day: 'Fri', minutes: 50, lessons: 3 },
  { day: 'Sat', minutes: 20, lessons: 1 },
  { day: 'Sun', minutes: 0, lessons: 0 },
];

export default function ParentProgressPage() {
  const totalMinutes = WEEKLY_ACTIVITY.reduce((sum, d) => sum + d.minutes, 0);
  const totalLessons = WEEKLY_ACTIVITY.reduce((sum, d) => sum + d.lessons, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">Track your child&apos;s academic progress</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">78%</p>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-green-100 p-3">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalLessons}</p>
              <p className="text-sm text-muted-foreground">Lessons This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-purple-100 p-3">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(totalMinutes / 60)}h</p>
              <p className="text-sm text-muted-foreground">Study Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-full bg-amber-100 p-3">
              <Target className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">5/7</p>
              <p className="text-sm text-muted-foreground">Goals Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="activity">Weekly Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Progress</CardTitle>
              <CardDescription>Performance breakdown by subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {SUBJECTS.map((subject) => (
                <div key={subject.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${subject.color}`} />
                      <span className="font-medium">{subject.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-green-600">{subject.trend}</span>
                      <span className="font-bold">{subject.grade}</span>
                    </div>
                  </div>
                  <Progress value={subject.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity</CardTitle>
              <CardDescription>Learning activity for the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {WEEKLY_ACTIVITY.map((day) => (
                  <div key={day.day} className="text-center">
                    <div
                      className="mx-auto mb-2 rounded-lg bg-primary/10"
                      style={{
                        height: `${Math.max(day.minutes, 10)}px`,
                        maxHeight: '100px',
                      }}
                    />
                    <p className="text-xs font-medium">{day.day}</p>
                    <p className="text-xs text-muted-foreground">{day.minutes}m</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
