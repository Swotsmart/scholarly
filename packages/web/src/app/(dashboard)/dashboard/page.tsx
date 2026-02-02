'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardIntelligence } from '@/hooks/use-dashboard-intelligence';
import {
  HeroGreeting, InsightsGrid, ContinuationsCard,
  UpcomingEventsCard, SuggestedActionsCard,
} from '@/components/dashboard/intelligent-cards';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Flame, Star, MessageCircle, BookOpen, Brain, Lightbulb,
  ArrowRight, Calendar, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// LEARNER DASHBOARD
// =============================================================================

function LearnerDashboard() {
  const { user } = useAuthStore();
  const { time, insights, continuations } = useDashboardIntelligence();

  return (
    <div className="space-y-6">
      <HeroGreeting
        time={time}
        avatarSlot={
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
            <AvatarFallback className="text-lg font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
        }
        statsSlot={
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-2.5">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xl font-bold text-orange-600">12</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-2.5">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xl font-bold text-yellow-600">Level 8</p>
                <p className="text-xs text-muted-foreground">2,450 XP</p>
              </div>
            </div>
          </div>
        }
      />

      <InsightsGrid insights={insights} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ContinuationsCard items={continuations} />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Recommended For You
              </CardTitle>
              <CardDescription>From the Curiosity Engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="group flex items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
                  <Brain className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Try 3D Modelling</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Based on your design interest</p>
                </div>
              </div>
              <div className="group flex items-start gap-3 rounded-lg border p-3 transition-all hover:border-primary/50">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Maths Challenge</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Test your algebra skills</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/golden-path/curiosity">
                  Explore More <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Buddy FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600" asChild>
          <Link href="/ai-buddy">
            <MessageCircle className="h-6 w-6" />
            <span className="sr-only">Chat with AI Buddy</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// TEACHER DASHBOARD
// =============================================================================

function TeacherDashboard() {
  const { user } = useAuthStore();
  const { time, insights, continuations, upcoming, suggestions } = useDashboardIntelligence();

  return (
    <div className="space-y-6">
      <HeroGreeting
        time={time}
        avatarSlot={
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
            <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
          </Avatar>
        }
      />

      <InsightsGrid insights={insights} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ContinuationsCard items={continuations} title="Resume Your Work" />
        <div className="space-y-6">
          <UpcomingEventsCard events={upcoming} />
          <SuggestedActionsCard suggestions={suggestions} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PARENT DASHBOARD
// =============================================================================

function ParentDashboard() {
  const { user } = useAuthStore();
  const { time, insights, continuations } = useDashboardIntelligence();

  return (
    <div className="space-y-6">
      <HeroGreeting
        time={time}
        avatarSlot={
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
            <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
          </Avatar>
        }
        statsSlot={
          <Badge variant="secondary" className="text-sm px-3 py-1">
            2 children enrolled
          </Badge>
        }
      />

      <InsightsGrid insights={insights} />

      <ContinuationsCard items={continuations} title="Your Children's Progress" />
    </div>
  );
}

// =============================================================================
// TUTOR DASHBOARD
// =============================================================================

function TutorDashboard() {
  const { user } = useAuthStore();
  const { time, insights } = useDashboardIntelligence();

  return (
    <div className="space-y-6">
      <HeroGreeting
        time={time}
        avatarSlot={
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
            <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
          </Avatar>
        }
      />

      <InsightsGrid insights={insights} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { time: '10:00 AM', student: 'Emma S.', subject: 'Maths — Fractions', status: 'upcoming' },
              { time: '11:30 AM', student: 'Jack W.', subject: 'English — Essay Writing', status: 'upcoming' },
              { time: '2:00 PM', student: 'Liam T.', subject: 'Science — Chemistry', status: 'upcoming' },
              { time: '4:00 PM', student: 'Sophie R.', subject: 'Maths — Algebra', status: 'upcoming' },
            ].map((session, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground w-16 shrink-0">{session.time}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.student}</p>
                  <p className="text-xs text-muted-foreground">{session.subject}</p>
                </div>
                <Button size="sm" variant="outline">Prep</Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Sessions Completed', value: '14', max: '18' },
              { label: 'Student Satisfaction', value: '4.9', max: '5.0' },
              { label: 'Hours Tutored', value: '21', max: '25' },
            ].map((metric, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-medium">{metric.value}/{metric.max}</span>
                </div>
                <Progress value={(parseFloat(metric.value) / parseFloat(metric.max)) * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// ADMIN DASHBOARD
// =============================================================================

function AdminDashboard() {
  const { user } = useAuthStore();
  const { time, insights } = useDashboardIntelligence();

  return (
    <div className="space-y-6">
      <HeroGreeting
        time={time}
        avatarSlot={
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
            <AvatarFallback>{user?.firstName?.[0]}{user?.lastName?.[0]}</AvatarFallback>
          </Avatar>
        }
      />

      <InsightsGrid insights={insights} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Platform Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'New Registrations', value: '47', change: '+12%' },
                { label: 'Active Sessions', value: '342', change: '+8%' },
                { label: 'Content Published', value: '23', change: '+5%' },
                { label: 'Support Tickets', value: '8', change: '-15%' },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">{stat.change}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'KYC Verifications', count: 3, href: '/admin/users' },
              { label: 'Content Approvals', count: 2, href: '/admin/marketplace' },
              { label: 'Support Escalations', count: 2, href: '/admin/reports' },
            ].map((action, i) => (
              <Link key={i} href={action.href}>
                <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <span className="text-sm">{action.label}</span>
                  <Badge>{action.count}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD PAGE — redirects to role-specific dashboards
// =============================================================================

export default function IntelligentDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const role = user?.role || 'learner';

  useEffect(() => {
    if (isLoading) return;

    // Redirect to role-specific dashboards that have dedicated pages
    switch (role) {
      case 'teacher':
      case 'educator':
        router.replace('/teacher/dashboard');
        break;
      case 'parent':
      case 'guardian':
        router.replace('/parent/dashboard');
        break;
      case 'platform_admin':
      case 'admin':
        router.replace('/admin/dashboard');
        break;
      // Tutors and learners stay on this page
    }
  }, [role, isLoading, router]);

  // Show loading or redirect state for roles that have dedicated pages
  if (!isLoading && (role === 'teacher' || role === 'educator' || role === 'parent' || role === 'guardian' || role === 'platform_admin' || role === 'admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Redirecting to your dashboard...</div>
      </div>
    );
  }

  // Render role-specific dashboard for tutors and learners
  switch (role) {
    case 'tutor':
    case 'tutor_professional':
      return <TutorDashboard />;
    default:
      return <LearnerDashboard />;
  }
}
