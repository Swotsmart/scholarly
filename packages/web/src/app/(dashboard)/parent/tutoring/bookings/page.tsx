'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Video, MessageSquare, XCircle, CheckCircle2 } from 'lucide-react';

const BOOKINGS = [
  {
    id: 'b1',
    tutor: {
      name: 'Dr. Sarah Chen',
      avatar: '',
      subject: 'Mathematics',
    },
    child: 'Emma',
    date: 'Feb 3, 2026',
    time: '5:00 PM - 6:00 PM',
    type: 'video',
    status: 'upcoming',
    topic: 'Algebra - Quadratic Equations',
  },
  {
    id: 'b2',
    tutor: {
      name: 'James Wilson',
      avatar: '',
      subject: 'English Literature',
    },
    child: 'Emma',
    date: 'Feb 5, 2026',
    time: '4:00 PM - 5:00 PM',
    type: 'video',
    status: 'upcoming',
    topic: 'Essay Writing Techniques',
  },
  {
    id: 'b3',
    tutor: {
      name: 'Dr. Sarah Chen',
      avatar: '',
      subject: 'Mathematics',
    },
    child: 'Emma',
    date: 'Jan 27, 2026',
    time: '5:00 PM - 6:00 PM',
    type: 'video',
    status: 'completed',
    topic: 'Linear Equations',
  },
  {
    id: 'b4',
    tutor: {
      name: 'Maria Garcia',
      avatar: '',
      subject: 'Spanish',
    },
    child: 'Oliver',
    date: 'Jan 25, 2026',
    time: '3:30 PM - 4:30 PM',
    type: 'video',
    status: 'completed',
    topic: 'Conversational Spanish',
  },
  {
    id: 'b5',
    tutor: {
      name: 'Dr. Sarah Chen',
      avatar: '',
      subject: 'Mathematics',
    },
    child: 'Emma',
    date: 'Jan 20, 2026',
    time: '5:00 PM - 6:00 PM',
    type: 'video',
    status: 'cancelled',
    topic: 'Geometry Review',
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'upcoming':
      return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
    case 'completed':
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function ParentTutoringBookingsPage() {
  const upcomingBookings = BOOKINGS.filter(b => b.status === 'upcoming');
  const pastBookings = BOOKINGS.filter(b => b.status !== 'upcoming');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tutoring Bookings</h1>
          <p className="text-muted-foreground">Manage your children's tutoring sessions</p>
        </div>
        <Button>Book New Session</Button>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>{upcomingBookings.length} sessions scheduled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming sessions</p>
          ) : (
            upcomingBookings.map((booking) => (
              <div key={booking.id} className="flex items-start gap-4 rounded-lg border p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={booking.tutor.avatar} />
                  <AvatarFallback>
                    {booking.tutor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{booking.tutor.name}</p>
                      <p className="text-sm text-muted-foreground">{booking.tutor.subject}</p>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>
                  <p className="text-sm mt-1">{booking.topic}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {booking.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {booking.time}
                    </span>
                    <Badge variant="outline">{booking.child}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm">
                      <Video className="h-4 w-4 mr-1" />
                      Join Session
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive">
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Past Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Past Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pastBookings.map((booking) => (
            <div key={booking.id} className="flex items-start gap-4 rounded-lg border p-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={booking.tutor.avatar} />
                <AvatarFallback>
                  {booking.tutor.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{booking.tutor.name}</p>
                    <p className="text-sm text-muted-foreground">{booking.topic}</p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {booking.date}
                  </span>
                  <Badge variant="outline">{booking.child}</Badge>
                </div>
                {booking.status === 'completed' && (
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
