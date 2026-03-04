'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GraduationCap, Calendar, Clock, Star, Search, Video, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTutoring } from '@/hooks/use-tutoring';
import type { Booking, TutorSearchResult } from '@/types/tutoring';

// ---------------------------------------------------------------------------
// Bridge functions
// ---------------------------------------------------------------------------

interface SessionDisplay {
  id: string; tutor: string; tutorAvatar: string | null; subject: string;
  date: string; time: string; duration: string; child: string; status: string;
}

function bridgeSessions(bookings: Booking[]): SessionDisplay[] {
  return bookings.map(b => {
    const start = new Date(b.scheduledStart);
    const end = new Date(b.scheduledEnd);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    const childName = b.learnerIds[0]?.includes('amelia') ? 'Amelia' : b.learnerIds[0]?.includes('liam') ? 'Liam' : 'Child';
    return {
      id: b.id, tutor: b.tutor.user.displayName, tutorAvatar: b.tutor.user.avatarUrl,
      subject: b.subjectId.charAt(0).toUpperCase() + b.subjectId.slice(1),
      date: start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
      duration: `${mins} min`, child: childName, status: b.status,
    };
  });
}

interface TutorDisplay {
  id: string; name: string; avatar: string | null; subjects: string[];
  rating: number; reviews: number; hourlyRate: number;
}

function bridgeTutors(tutors: TutorSearchResult[]): TutorDisplay[] {
  return tutors.slice(0, 3).map(t => ({
    id: t.tutorId, name: t.name, avatar: t.avatarUrl,
    subjects: t.subjects.map(s => s.subjectName),
    rating: t.metrics.averageRating, reviews: t.metrics.totalReviews,
    hourlyRate: t.pricing.hourlyRate1to1,
  }));
}

// Fallback
const SESSIONS_FB: SessionDisplay[] = [
  { id: 's1', tutor: 'Dr. Sarah Chen', tutorAvatar: '/tutors/sarah.jpg', subject: 'Mathematics', date: 'Feb 3, 2026', time: '5:00 PM', duration: '1 hour', child: 'Emma', status: 'confirmed' },
  { id: 's2', tutor: 'Mr. James Liu', tutorAvatar: '/tutors/james.jpg', subject: 'English', date: 'Feb 5, 2026', time: '4:00 PM', duration: '1 hour', child: 'Oliver', status: 'pending' },
];
const TUTORS_FB: TutorDisplay[] = [
  { id: 't1', name: 'Dr. Sarah Chen', avatar: '/tutors/sarah.jpg', subjects: ['Mathematics', 'Physics'], rating: 4.9, reviews: 128, hourlyRate: 65 },
  { id: 't2', name: 'Mr. James Liu', avatar: '/tutors/james.jpg', subjects: ['English', 'Creative Writing'], rating: 4.8, reviews: 95, hourlyRate: 55 },
  { id: 't3', name: 'Ms. Emily Park', avatar: '/tutors/emily.jpg', subjects: ['Science', 'Biology'], rating: 4.7, reviews: 72, hourlyRate: 60 },
];

export default function ParentTutoringPage() {
  const { data, isLoading } = useTutoring();
  const sessions = data ? bridgeSessions(data.upcomingBookings) : SESSIONS_FB;
  const tutors = data ? bridgeTutors(data.tutors) : TUTORS_FB;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutoring</h1>
          <p className="text-muted-foreground">Manage tutoring sessions for your children</p>
        </div>
        <Button asChild><Link href="/parent/tutoring/search"><Search className="h-4 w-4 mr-2" />Find Tutors</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Upcoming Sessions</CardTitle>
          <CardDescription>Scheduled tutoring sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-lg border p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={s.tutorAvatar || undefined} alt={s.tutor} />
                <AvatarFallback>{s.tutor[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.tutor}</p>
                  <Badge variant="secondary">{s.subject}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{s.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.time} ({s.duration})</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">For: {s.child}</p>
              </div>
              <div className="flex items-center gap-2">
                {s.status === 'confirmed' ? (
                  <Button size="sm"><Video className="h-4 w-4 mr-1" />Join</Button>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" asChild><Link href="/parent/tutoring/bookings">View All Sessions</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Recommended Tutors</CardTitle>
          <CardDescription>Top-rated tutors for your children</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {tutors.map((t) => (
              <div key={t.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={t.avatar || undefined} alt={t.name} />
                    <AvatarFallback>{t.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" /><span>{t.rating}</span>
                      <span className="text-muted-foreground">({t.reviews})</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.subjects.map((sub) => <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>)}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-medium">${t.hourlyRate}/hr</span>
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
