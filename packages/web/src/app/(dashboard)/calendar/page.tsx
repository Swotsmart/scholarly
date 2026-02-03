'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react';

export default function CalendarPage() {
  const events = [
    { id: 1, title: 'Math Tutorial', time: '9:00 AM', location: 'Room 101', type: 'class' },
    { id: 2, title: 'Science Lab', time: '11:00 AM', location: 'Lab 3', type: 'class' },
    { id: 3, title: 'Study Group', time: '2:00 PM', location: 'Library', type: 'group' },
    { id: 4, title: 'Parent Meeting', time: '4:00 PM', location: 'Office', type: 'meeting' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">View and manage your schedule</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Today&apos;s Schedule
            </CardTitle>
            <CardDescription>Your events for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-3 rounded-lg border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Events this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Calendar integration coming soon</p>
              <p className="text-sm">Connect your calendar to see all events</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
