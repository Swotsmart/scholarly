'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Calendar, Clock, Star, Search, Video } from 'lucide-react';
import Link from 'next/link';

const UPCOMING_SESSIONS = [
  {
    id: 's1',
    tutor: 'Dr. Sarah Chen',
    tutorAvatar: '/tutors/sarah.jpg',
    subject: 'Mathematics',
    date: 'Feb 3, 2026',
    time: '5:00 PM',
    duration: '1 hour',
    child: 'Emma',
    status: 'confirmed',
  },
  {
    id: 's2',
    tutor: 'Mr. James Liu',
    tutorAvatar: '/tutors/james.jpg',
    subject: 'English',
    date: 'Feb 5, 2026',
    time: '4:00 PM',
    duration: '1 hour',
    child: 'Oliver',
    status: 'pending',
  },
];

const RECOMMENDED_TUTORS = [
  {
    id: 't1',
    name: 'Dr. Sarah Chen',
    avatar: '/tutors/sarah.jpg',
    subjects: ['Mathematics', 'Physics'],
    rating: 4.9,
    reviews: 128,
    hourlyRate: 65,
  },
  {
    id: 't2',
    name: 'Mr. James Liu',
    avatar: '/tutors/james.jpg',
    subjects: ['English', 'Creative Writing'],
    rating: 4.8,
    reviews: 95,
    hourlyRate: 55,
  },
  {
    id: 't3',
    name: 'Ms. Emily Park',
    avatar: '/tutors/emily.jpg',
    subjects: ['Science', 'Biology'],
    rating: 4.7,
    reviews: 72,
    hourlyRate: 60,
  },
];

export default function ParentTutoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutoring</h1>
          <p className="text-muted-foreground">Manage tutoring sessions for your children</p>
        </div>
        <Button asChild>
          <Link href="/parent/tutoring/search">
            <Search className="h-4 w-4 mr-2" />
            Find Tutors
          </Link>
        </Button>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>Scheduled tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {UPCOMING_SESSIONS.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={session.tutorAvatar} alt={session.tutor} />
                <AvatarFallback>{session.tutor[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{session.tutor}</p>
                  <Badge variant="secondary">{session.subject}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {session.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {session.time} ({session.duration})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">For: {session.child}</p>
              </div>
              <div className="flex items-center gap-2">
                {session.status === 'confirmed' ? (
                  <Button size="sm">
                    <Video className="h-4 w-4 mr-1" />
                    Join
                  </Button>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/parent/tutoring/bookings">View All Sessions</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recommended Tutors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Recommended Tutors
          </CardTitle>
          <CardDescription>Top-rated tutors for your children</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {RECOMMENDED_TUTORS.map((tutor) => (
              <div key={tutor.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={tutor.avatar} alt={tutor.name} />
                    <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{tutor.name}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span>{tutor.rating}</span>
                      <span className="text-muted-foreground">({tutor.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tutor.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-medium">${tutor.hourlyRate}/hr</span>
                  <Button size="sm" variant="outline">Book</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
