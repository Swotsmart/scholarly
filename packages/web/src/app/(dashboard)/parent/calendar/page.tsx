'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen, GraduationCap, Users, Bell, Loader2, Star } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { DailyDigest, ChildDigest } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const EVENTS_FALLBACK = [
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

// ---------------------------------------------------------------------------
// Bridge: API DailyDigest → calendar events
// The digest provides today's learning sessions per child. We translate
// these into event-like items for the upcoming panel, and mix in
// recommendation-based "suggested" events.
// ---------------------------------------------------------------------------
function bridgeDigestToEvents(digest: DailyDigest) {
  const events: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    time: string;
    child: string;
    color: string;
  }> = [];

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });

  // Today's sessions as events
  digest.children.forEach((child: ChildDigest, idx: number) => {
    if (child.stats.sessionsCount > 0) {
      events.push({
        id: `digest-${child.childId}-sessions`,
        title: `${child.stats.sessionsCount} learning session${child.stats.sessionsCount !== 1 ? 's' : ''} completed`,
        type: 'session',
        date: todayStr,
        time: `${child.stats.totalMinutes} min`,
        child: child.preferredName || child.firstName,
        color: 'bg-green-500',
      });
    }

    if (child.stats.graphemesPracticed.length > 0) {
      events.push({
        id: `digest-${child.childId}-phonics`,
        title: `Practiced: ${child.stats.graphemesPracticed.join(', ')}`,
        type: 'phonics',
        date: todayStr,
        time: '',
        child: child.preferredName || child.firstName,
        color: 'bg-blue-500',
      });
    }
  });

  // Recommendations as suggested events
  digest.recommendations.forEach((rec: string, idx: number) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    events.push({
      id: `rec-${idx}`,
      title: rec,
      type: 'recommendation',
      date: tomorrow.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: '',
      child: 'All',
      color: 'bg-amber-500',
    });
  });

  return events;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getEventIcon(type: string) {
  switch (type) {
    case 'assignment':
      return <BookOpen className="h-4 w-4" />;
    case 'tutoring':
      return <GraduationCap className="h-4 w-4" />;
    case 'event':
      return <Users className="h-4 w-4" />;
    case 'session':
      return <Star className="h-4 w-4" />;
    case 'phonics':
      return <BookOpen className="h-4 w-4" />;
    case 'recommendation':
      return <Bell className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentCalendarPage() {
  const { digest, isLoading } = useParent();

  const EVENTS = digest
    ? bridgeDigestToEvents(digest)
    : EVENTS_FALLBACK;

  const today = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">View upcoming events and learning activity</p>
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
              {digest ? "Today's Activity" : 'Upcoming'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EVENTS.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No events to show</p>
            ) : (
              EVENTS.slice(0, 6).map((event) => (
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
                      {event.time && (
                        <>
                          <Clock className="h-3 w-3 ml-2" />
                          {event.time}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
