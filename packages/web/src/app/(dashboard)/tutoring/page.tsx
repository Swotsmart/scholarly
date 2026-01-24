'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  Star,
  ArrowRight,
  Video,
} from 'lucide-react';

const stats = [
  { label: 'Total Sessions', value: '12', icon: Video },
  { label: 'Hours Tutored', value: '18', icon: Clock },
  { label: 'Favorite Tutors', value: '3', icon: Star },
  { label: 'Upcoming', value: '2', icon: Calendar },
];

const upcomingSessions = [
  {
    id: 'session_1',
    tutor: 'Sarah Chen',
    subject: 'Mathematics',
    topic: 'Algebra - Quadratic Equations',
    date: '2024-01-25',
    time: '4:00 PM',
    duration: '1 hour',
    type: 'Online',
  },
  {
    id: 'session_2',
    tutor: 'Michael Torres',
    subject: 'Physics',
    topic: 'Mechanics - Motion',
    date: '2024-01-27',
    time: '3:00 PM',
    duration: '1 hour',
    type: 'Online',
  },
];

const recentTutors = [
  {
    id: 'tutor_1',
    name: 'Sarah Chen',
    subjects: ['Mathematics', 'Physics'],
    rating: 4.8,
    sessions: 8,
    avatar: null,
  },
  {
    id: 'tutor_2',
    name: 'Michael Torres',
    subjects: ['Physics', 'Chemistry'],
    rating: 4.9,
    sessions: 4,
    avatar: null,
  },
];

export default function TutoringPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Tutoring</h1>
          <p className="text-muted-foreground">
            Book sessions with qualified tutors
          </p>
        </div>
        <Button asChild>
          <Link href="/tutoring/search">
            Find a Tutor
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tutoring/bookings">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{session.subject}</p>
                    <p className="text-sm text-muted-foreground">{session.topic}</p>
                    <p className="text-sm text-muted-foreground">with {session.tutor}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{new Date(session.date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">{session.time}</p>
                  <Badge variant="secondary" className="mt-1">
                    <Video className="mr-1 h-3 w-3" />
                    {session.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tutors */}
      <Card>
        <CardHeader>
          <CardTitle>Your Tutors</CardTitle>
          <CardDescription>Tutors you've worked with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {recentTutors.map((tutor) => (
              <div
                key={tutor.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{tutor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tutor.subjects.join(', ')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{tutor.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        • {tutor.sessions} sessions
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Book Again
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
