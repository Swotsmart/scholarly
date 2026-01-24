'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Clock,
  Trophy,
  Lightbulb,
} from 'lucide-react';

const overviewStats = [
  { label: 'Total Learning Hours', value: '42', change: '+12%', icon: Clock },
  { label: 'Courses Completed', value: '4', change: '+2', icon: Trophy },
  { label: 'Design Journeys', value: '3', change: '+1', icon: Lightbulb },
  { label: 'Portfolio Views', value: '127', change: '+34%', icon: Users },
];

const skillProgress = [
  { skill: 'Design Thinking', level: 85, trend: 'up' },
  { skill: 'User Research', level: 78, trend: 'up' },
  { skill: 'Prototyping', level: 72, trend: 'up' },
  { skill: 'Presentation', level: 65, trend: 'stable' },
  { skill: 'Problem Solving', level: 80, trend: 'up' },
];

const weeklyActivity = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 1.5 },
  { day: 'Wed', hours: 3.0 },
  { day: 'Thu', hours: 2.0 },
  { day: 'Fri', hours: 2.5 },
  { day: 'Sat', hours: 1.0 },
  { day: 'Sun', hours: 0.5 },
];

export default function AnalyticsPage() {
  const maxHours = Math.max(...weeklyActivity.map(d => d.hours));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Analytics</h1>
        <p className="text-muted-foreground">
          Track your learning progress and achievements
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.change}
                  </Badge>
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Hours spent learning this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48">
              {weeklyActivity.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{day.hours}h</span>
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${(day.hours / maxHours) * 100}%`, minHeight: '8px' }}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skill Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Development</CardTitle>
            <CardDescription>Your proficiency across key areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {skillProgress.map((skill) => (
              <div key={skill.skill} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span>{skill.level}%</span>
                    {skill.trend === 'up' && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Learning Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Learning Goals
          </CardTitle>
          <CardDescription>Track your progress towards your goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Complete Design Course</span>
                <Badge variant="success">75%</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }} />
              </div>
              <p className="text-sm text-muted-foreground">9 of 12 lessons completed</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Publish Portfolio</span>
                <Badge variant="success">Done</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
              </div>
              <p className="text-sm text-muted-foreground">Completed on Jan 20</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">10 Tutoring Hours</span>
                <Badge>60%</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '60%' }} />
              </div>
              <p className="text-sm text-muted-foreground">6 of 10 hours completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
