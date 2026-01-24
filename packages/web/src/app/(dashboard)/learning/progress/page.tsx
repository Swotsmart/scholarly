'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Trophy,
  Clock,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from 'lucide-react';

const progressData = {
  totalHours: 24,
  coursesCompleted: 2,
  coursesInProgress: 2,
  currentStreak: 5,
  longestStreak: 12,
  achievements: [
    { id: 'a1', title: 'First Course Complete', icon: Trophy, earned: true },
    { id: 'a2', title: 'Week Streak', icon: Calendar, earned: true },
    { id: 'a3', title: 'Design Thinker', icon: Target, earned: true },
    { id: 'a4', title: 'Speed Learner', icon: TrendingUp, earned: false },
  ],
  weeklyActivity: [
    { day: 'Mon', hours: 1.5 },
    { day: 'Tue', hours: 2 },
    { day: 'Wed', hours: 0.5 },
    { day: 'Thu', hours: 1 },
    { day: 'Fri', hours: 2.5 },
    { day: 'Sat', hours: 0 },
    { day: 'Sun', hours: 1 },
  ],
  courseProgress: [
    { name: 'Design Thinking', progress: 75, total: 12, completed: 9 },
    { name: 'Presentation Skills', progress: 40, total: 8, completed: 3 },
  ],
};

export default function ProgressPage() {
  const maxHours = Math.max(...progressData.weeklyActivity.map(d => d.hours));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">My Progress</h1>
        <p className="text-muted-foreground">
          Track your learning achievements and milestones
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{progressData.totalHours}h</p>
              <p className="text-sm text-muted-foreground">Total Learning</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{progressData.coursesCompleted}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Target className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{progressData.coursesInProgress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-orange-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{progressData.currentStreak} days</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Hours spent learning this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {progressData.weeklyActivity.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                    style={{ height: day.hours > 0 ? `${(day.hours / maxHours) * 100}%` : '4px' }}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Badges you've earned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {progressData.achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      achievement.earned ? 'bg-primary/10' : 'bg-muted opacity-50'
                    }`}
                  >
                    <div className={`rounded-full p-2 ${achievement.earned ? 'bg-primary/20' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${achievement.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className="text-sm font-medium">{achievement.title}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
          <CardDescription>Your progress in active courses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {progressData.courseProgress.map((course) => (
            <div key={course.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{course.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {course.completed}/{course.total} lessons
                </span>
              </div>
              <Progress value={course.progress} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
