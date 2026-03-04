'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Video, MessageSquare, XCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useTutoring } from '@/hooks/use-tutoring';
import type { Booking } from '@/types/tutoring';

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

interface BookingDisplay {
  id: string;
  tutor: { name: string; avatar: string; subject: string };
  child: string; date: string; time: string; type: string; status: string; topic: string;
}

function bridgeBookings(bookings: Booking[]): BookingDisplay[] {
  return bookings.map(b => {
    const start = new Date(b.scheduledStart);
    const end = new Date(b.scheduledEnd);
    const startStr = start.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
    const endStr = end.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
    const isFuture = start > new Date();
    const childName = b.learnerIds[0]?.includes('amelia') ? 'Amelia' : b.learnerIds[0]?.includes('liam') ? 'Liam' : 'Child';
    return {
      id: b.id,
      tutor: { name: b.tutor.user.displayName, avatar: b.tutor.user.avatarUrl || '', subject: b.subjectId.charAt(0).toUpperCase() + b.subjectId.slice(1) },
      child: childName,
      date: start.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: `${startStr} - ${endStr}`, type: b.sessionType,
      status: isFuture && (b.status === 'confirmed' || b.status === 'pending') ? 'upcoming' : b.status,
      topic: b.topicsNeedingHelp?.[0] || b.subjectId,
    };
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'upcoming': return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
    case 'confirmed': return <Badge className="bg-blue-100 text-blue-700">Confirmed</Badge>;
    case 'completed': return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    case 'cancelled': return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    case 'pending': return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
}

const FALLBACK: BookingDisplay[] = [
  { id: 'b1', tutor: { name: 'Dr. Sarah Chen', avatar: '', subject: 'Mathematics' }, child: 'Emma', date: 'Feb 3, 2026', time: '5:00 PM - 6:00 PM', type: 'video', status: 'upcoming', topic: 'Algebra - Quadratic Equations' },
  { id: 'b2', tutor: { name: 'James Wilson', avatar: '', subject: 'English Literature' }, child: 'Emma', date: 'Feb 5, 2026', time: '4:00 PM - 5:00 PM', type: 'video', status: 'upcoming', topic: 'Essay Writing Techniques' },
  { id: 'b3', tutor: { name: 'Dr. Sarah Chen', avatar: '', subject: 'Mathematics' }, child: 'Emma', date: 'Jan 27, 2026', time: '5:00 PM - 6:00 PM', type: 'video', status: 'completed', topic: 'Linear Equations' },
  { id: 'b4', tutor: { name: 'Maria Garcia', avatar: '', subject: 'Spanish' }, child: 'Oliver', date: 'Jan 25, 2026', time: '3:30 PM - 4:30 PM', type: 'video', status: 'completed', topic: 'Conversational Spanish' },
  { id: 'b5', tutor: { name: 'Dr. Sarah Chen', avatar: '', subject: 'Mathematics' }, child: 'Emma', date: 'Jan 20, 2026', time: '5:00 PM - 6:00 PM', type: 'video', status: 'cancelled', topic: 'Geometry Review' },
];

export default function ParentTutoringBookingsPage() {
  const { data, isLoading } = useTutoring();
  const bookings = data ? bridgeBookings(data.allBookings) : FALLBACK;
  const upcomingBookings = bookings.filter(b => b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutoring Bookings</h1>
          <p className="text-muted-foreground">Manage your children&apos;s tutoring sessions</p>
        </div>
        <Button>Book New Session</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Upcoming Sessions</CardTitle>
          <CardDescription>{upcomingBookings.length} sessions scheduled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming sessions</p>
          ) : upcomingBookings.map((b) => (
            <div key={b.id} className="flex items-start gap-4 rounded-lg border p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={b.tutor.avatar} />
                <AvatarFallback>{b.tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-medium">{b.tutor.name}</p><p className="text-sm text-muted-foreground">{b.tutor.subject}</p></div>
                  {getStatusBadge(b.status)}
                </div>
                <p className="text-sm mt-1">{b.topic}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.time}</span>
                  <Badge variant="outline">{b.child}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm"><Video className="h-4 w-4 mr-1" />Join Session</Button>
                  <Button size="sm" variant="outline"><MessageSquare className="h-4 w-4 mr-1" />Message</Button>
                  <Button size="sm" variant="ghost" className="text-destructive"><XCircle className="h-4 w-4 mr-1" />Cancel</Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" />Past Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pastBookings.map((b) => (
            <div key={b.id} className="flex items-start gap-4 rounded-lg border p-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={b.tutor.avatar} />
                <AvatarFallback>{b.tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-medium">{b.tutor.name}</p><p className="text-sm text-muted-foreground">{b.topic}</p></div>
                  {getStatusBadge(b.status)}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{b.date}</span>
                  <Badge variant="outline">{b.child}</Badge>
                </div>
                {b.status === 'completed' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline">View Notes</Button>
                    <Button size="sm" variant="outline">Book Again</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
