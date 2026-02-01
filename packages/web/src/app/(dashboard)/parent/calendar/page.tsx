'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, GraduationCap, Users, Bell } from 'lucide-react';

const EVENTS = [
  {
    id: 'e1',
    title: 'Math Homework Due',
    type: 'assignment',
    date: 'Feb 2, 2026',
    time: '3:00 PM',
    child: 'Emma',
    color: 'bg-blue-500',
  },
  {
    id: 'e2',
    title: 'Math Tutoring Session',
    type: 'tutoring',
    date: 'Feb 3, 2026',
    time: '5:00 PM',
    child: 'Emma',
    color: 'bg-green-500',
  },
  {
    id: 'e3',
    title: 'Parent-Teacher Conference',
    type: 'event',
    date: 'Feb 5, 2026',
    time: '4:30 PM',
    child: 'All',
    color: 'bg-purple-500',
  },
  {
    id: 'e4',
    title: 'Book Report Due',
    type: 'assignment',
    date: 'Feb 8, 2026',
    time: '9:00 AM',
    child: 'Emma',
    color: 'bg-blue-500',
  },
  {
    id: 'e5',
    title: 'School Excursion - Museum',
    type: 'event',
    date: 'Feb 12, 2026',
    time: '9:00 AM',
    child: 'Emma',
    color: 'bg-amber-500',
  },
  {
    id: 'e6',
    title: 'Drama Performance',
    type: 'event',
    date: 'Feb 15, 2026',
    time: '6:00 PM',
    child: 'Emma',
    color: 'bg-pink-500',
  },
];

function getEventIcon(type: string) {
  switch (type) {
    case 'assignment':
      return <BookOpen className="h-4 w-4" />;
    case 'tutoring':
      return <GraduationCap className="h-4 w-4" />;
    case 'event':
      return <Users className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

export default function ParentCalendarPage() {
  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">View upcoming events and deadlines</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{currentMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day) => (
                <div key={day} className="p-2 text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {/* Simple calendar grid - would be a full calendar component in production */}
              {Array.from({ length: 35 }, (_, i) => {
                const dayNum = i - 5; // Offset for month start
                const isToday = dayNum === today.getDate();
                const isCurrentMonth = dayNum > 0 && dayNum <= 28;
                return (
                  <div
                    key={i}
                    className={`p-2 text-sm rounded-lg ${
                      isToday
                        ? 'bg-primary text-primary-foreground font-bold'
                        : isCurrentMonth
                        ? 'hover:bg-muted cursor-pointer'
                        : 'text-muted-foreground/30'
                    }`}
                  >
                    {isCurrentMonth ? dayNum : ''}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EVENTS.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`rounded-full ${event.color} p-2 text-white`}>
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{event.child}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {event.date}
                    <Clock className="h-3 w-3 ml-2" />
                    {event.time}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
