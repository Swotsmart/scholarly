'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Lightbulb,
  FolderOpen,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  Award,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your learning journey today.
          </p>
        </div>
        <Button asChild>
          <Link href="/design-pitch/journeys/new">
            <Sparkles className="mr-2 h-4 w-4" />
            Start New Journey
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Journeys</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +1 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              1 published, 1 draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127</div>
            <p className="text-xs text-muted-foreground">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Peer Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              3 pending feedback
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Journeys */}
        <Card>
          <CardHeader>
            <CardTitle>Active Design Journeys</CardTitle>
            <CardDescription>
              Your current design thinking projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                title: 'Sustainable Campus App',
                phase: 'Prototype',
                progress: 65,
                deadline: '3 days',
              },
              {
                title: 'Student Wellness Platform',
                phase: 'Ideate',
                progress: 40,
                deadline: '1 week',
              },
              {
                title: 'Accessibility in Education',
                phase: 'Empathize',
                progress: 15,
                deadline: '2 weeks',
              },
            ].map((journey, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{journey.title}</span>
                    <Badge variant="secondary">{journey.phase}</Badge>
                  </div>
                  <Progress value={journey.progress} className="h-2" />
                </div>
                <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {journey.deadline}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/design-pitch/journeys">
                View All Journeys
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              What&apos;s been happening in your portfolios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                type: 'view',
                message: 'Your portfolio was viewed by someone in Sydney',
                time: '2 hours ago',
                icon: TrendingUp,
              },
              {
                type: 'feedback',
                message: 'New guestbook entry on "Campus App" portfolio',
                time: '5 hours ago',
                icon: Users,
              },
              {
                type: 'ai',
                message: 'AI generated 5 new skill tags for your portfolio',
                time: '1 day ago',
                icon: Sparkles,
              },
              {
                type: 'milestone',
                message: 'You completed the Prototype phase!',
                time: '2 days ago',
                icon: Target,
              },
              {
                type: 'achievement',
                message: 'Earned "Rapid Prototyper" badge',
                time: '3 days ago',
                icon: Award,
              },
            ].map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Jump right into your most common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/design-pitch/journeys/new">
                <Lightbulb className="h-6 w-6" />
                <span>New Journey</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/showcase/portfolios/new">
                <FolderOpen className="h-6 w-6" />
                <span>Create Portfolio</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/design-pitch/reviews">
                <Users className="h-6 w-6" />
                <span>Review Peers</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <Link href="/showcase/analytics">
                <TrendingUp className="h-6 w-6" />
                <span>View Analytics</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
