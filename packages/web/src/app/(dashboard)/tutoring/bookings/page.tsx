'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Video,
  GraduationCap,
  MessageSquare,
  X,
} from 'lucide-react';

const bookings = {
  upcoming: [
    {
      id: 'booking_1',
      tutor: 'Sarah Chen',
      subject: 'Mathematics',
      topic: 'Algebra - Quadratic Equations',
      date: '2024-01-25',
      time: '4:00 PM',
      duration: '1 hour',
      type: 'Online',
      status: 'confirmed',
    },
    {
      id: 'booking_2',
      tutor: 'Michael Torres',
      subject: 'Physics',
      topic: 'Mechanics - Motion',
      date: '2024-01-27',
      time: '3:00 PM',
      duration: '1 hour',
      type: 'Online',
      status: 'confirmed',
    },
  ],
  past: [
    {
      id: 'booking_3',
      tutor: 'Sarah Chen',
      subject: 'Mathematics',
      topic: 'Algebra - Linear Equations',
      date: '2024-01-18',
      time: '4:00 PM',
      duration: '1 hour',
      type: 'Online',
      status: 'completed',
      rating: 5,
    },
    {
      id: 'booking_4',
      tutor: 'Emily Watson',
      subject: 'English',
      topic: 'Essay Writing',
      date: '2024-01-15',
      time: '5:00 PM',
      duration: '1 hour',
      type: 'Online',
      status: 'completed',
      rating: 4,
    },
  ],
};

function BookingCard({ booking, isPast }: { booking: typeof bookings.upcoming[0] & { rating?: number }; isPast?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium">{booking.subject}: {booking.topic}</p>
          <p className="text-sm text-muted-foreground">with {booking.tutor}</p>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(booking.date).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {booking.time}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Badge variant={booking.status === 'completed' ? 'secondary' : 'success'}>
          {booking.status}
        </Badge>
        {!isPast && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </Button>
            <Button size="sm">
              <Video className="mr-2 h-4 w-4" />
              Join
            </Button>
          </div>
        )}
        {isPast && !booking.rating && (
          <Button variant="outline" size="sm">
            Leave Review
          </Button>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">My Bookings</h1>
        <p className="text-muted-foreground">
          Manage your tutoring sessions
        </p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({bookings.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({bookings.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {bookings.upcoming.length > 0 ? (
            bookings.upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <Card className="p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No upcoming sessions</h3>
              <p className="mt-2 text-muted-foreground">
                Book a session with a tutor to get started
              </p>
              <Button className="mt-4">Find a Tutor</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-4">
          {bookings.past.map((booking) => (
            <BookingCard key={booking.id} booking={booking} isPast />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
