'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  Star,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatRelativeTime, getInitials } from '@/lib/utils';

interface DashboardSummary {
  upcomingSessions: number;
  totalSessions: number;
  savedContent: number;
  activeGoals: number;
  trustScore: number;
  tokenBalance: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    displayName: string;
    avatarUrl?: string;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get<{ activity: ActivityItem[] }>('/dashboard/activity'),
  });

  const stats = [
    {
      label: 'Upcoming Sessions',
      value: summary?.upcomingSessions ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Total Sessions',
      value: summary?.totalSessions ?? 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Saved Content',
      value: summary?.savedContent ?? 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Trust Score',
      value: summary?.trustScore ?? user?.trustScore ?? 0,
      icon: Star,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ];

  const quickActions = [
    { label: 'Find a Tutor', href: '/tutors', icon: Users },
    { label: 'Browse Content', href: '/content', icon: FileText },
    { label: 'Explore Curriculum', href: '/curriculum', icon: BookOpen },
    { label: 'View Sessions', href: '/sessions', icon: Calendar },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {user?.firstName ?? 'Learner'}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s what&apos;s happening with your learning journey.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="bg-scholarly-600 hover:bg-scholarly-700">
              <Link href="/tutors">
                <Sparkles className="mr-2 h-4 w-4" />
                Find a Tutor
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump to common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-scholarly-100 group-hover:bg-scholarly-200 transition-colors">
                      <action.icon className="h-4 w-4 text-scholarly-600" />
                    </div>
                    <span className="font-medium">{action.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-scholarly-600 transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest learning activities</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity?.activity && activity.activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.user?.avatarUrl} />
                        <AvatarFallback className="bg-scholarly-100 text-scholarly-700">
                          {item.user?.displayName
                            ? getInitials(item.user.displayName)
                            : getActivityIcon(item.type)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{item.title}</p>
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                  <p className="text-sm text-muted-foreground">
                    Start learning to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        <Card className="border-scholarly-200 bg-gradient-to-r from-scholarly-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-scholarly-600" />
              <CardTitle>AI Learning Recommendations</CardTitle>
            </div>
            <CardDescription>
              Personalized suggestions based on your learning goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <RecommendationCard
                title="Mathematics Fundamentals"
                description="Build strong foundations in algebra and geometry"
                type="Curriculum"
                href="/curriculum?subject=mathematics"
              />
              <RecommendationCard
                title="Dr. Sarah Chen"
                description="Highly rated tutor specializing in STEM subjects"
                type="Tutor"
                href="/tutors"
              />
              <RecommendationCard
                title="Problem Solving Workbook"
                description="Interactive exercises for Year 7-8 students"
                type="Content"
                href="/content"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function RecommendationCard({
  title,
  description,
  type,
  href,
}: {
  title: string;
  description: string;
  type: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-lg bg-white border hover:border-scholarly-300 hover:shadow-sm transition-all"
    >
      <Badge variant="outline" className="mb-2">
        {type}
      </Badge>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'session':
      return '📅';
    case 'content':
      return '📚';
    case 'achievement':
      return '🏆';
    default:
      return '✨';
  }
}
