'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  BookOpen,
  Clock,
  Bookmark,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Library,
  TrendingUp,
} from 'lucide-react';
import { children, weeklySchedule } from '@/lib/homeschool-api';

const stats = [
  { label: 'Children Enrolled', value: '2', icon: Users },
  { label: 'Subjects Active', value: '6', icon: BookOpen },
  { label: 'Weekly Hours', value: '25', icon: Clock },
  { label: 'Resources Saved', value: '34', icon: Bookmark },
];

const quickActions = [
  {
    label: 'Plan Curriculum',
    description: 'Design and manage learning plans',
    href: '/homeschool/curriculum',
    icon: ClipboardList,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    label: 'Browse Resources',
    description: 'Find worksheets, videos, and more',
    href: '/homeschool/resources',
    icon: Library,
    color: 'bg-green-500/10 text-green-500',
  },
  {
    label: 'Record Progress',
    description: 'Track achievements and milestones',
    href: '/homeschool/curriculum',
    icon: TrendingUp,
    color: 'bg-purple-500/10 text-purple-500',
  },
];

export default function HomeschoolPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Homeschool Hub</h1>
          <p className="text-muted-foreground">
            Manage your family&apos;s learning journey
          </p>
        </div>
        <Button asChild>
          <Link href="/homeschool/curriculum">
            <CalendarDays className="mr-2 h-4 w-4" />
            View Schedule
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Children Cards */}
      <div>
        <h2 className="heading-3 mb-4">Your Children</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {children.map((child) => (
            <Card key={child.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                    {child.avatar}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{child.name}</CardTitle>
                    <CardDescription>
                      Age {child.age} &middot; Year {child.yearLevel}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {child.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-medium">{child.overallProgress}%</span>
                  </div>
                  <Progress value={child.overallProgress} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Schedule */}
      <div>
        <h2 className="heading-3 mb-4">Weekly Schedule</h2>
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {weeklySchedule.map((day) => (
                      <th
                        key={day.day}
                        className="pb-3 text-left font-semibold text-muted-foreground"
                      >
                        {day.day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {weeklySchedule.map((day) => (
                      <td key={day.day} className="pr-4 pt-3 align-top">
                        <div className="space-y-2">
                          {day.subjects.map((subject) => (
                            <Badge
                              key={subject}
                              variant="outline"
                              className="mr-1 block w-fit"
                            >
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="heading-3 mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`rounded-lg p-3 ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{action.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
