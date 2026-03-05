'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useTeacher } from '@/hooks/use-teacher';
import type { Session } from '@/types/teacher';

// =============================================================================
// DATE HELPERS
// =============================================================================

function getMonthName(month: number): string {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][month];
}

function getDayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const days: Date[] = [];

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Next month padding to fill 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

// =============================================================================
// TYPES
// =============================================================================

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string | null;
  type: 'session' | 'class' | 'meeting' | 'group';
  location?: string;
  participants: number;
  status: string;
  subject?: string;
}

// =============================================================================
// DEMO / FALLBACK EVENTS
// =============================================================================

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function generateFallbackEvents(): CalendarEvent[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  return [
    {
      id: 'demo-1', title: 'Year 4 Maths Tutorial', date: new Date(y, m, d),
      startTime: new Date(y, m, d, 9, 0).toISOString(), endTime: new Date(y, m, d, 10, 0).toISOString(),
      type: 'class', location: 'Room 101', participants: 24, status: 'confirmed', subject: 'Mathematics',
    },
    {
      id: 'demo-2', title: 'Science Lab — Ecosystems', date: new Date(y, m, d),
      startTime: new Date(y, m, d, 11, 0).toISOString(), endTime: new Date(y, m, d, 12, 30).toISOString(),
      type: 'class', location: 'Lab 3', participants: 18, status: 'confirmed', subject: 'Science',
    },
    {
      id: 'demo-3', title: 'Study Group — Reading', date: new Date(y, m, d),
      startTime: new Date(y, m, d, 14, 0).toISOString(), endTime: new Date(y, m, d, 15, 0).toISOString(),
      type: 'group', location: 'Library', participants: 6, status: 'confirmed', subject: 'English',
    },
    {
      id: 'demo-4', title: 'Parent-Teacher Meeting', date: new Date(y, m, d),
      startTime: new Date(y, m, d, 16, 0).toISOString(), endTime: new Date(y, m, d, 16, 30).toISOString(),
      type: 'meeting', location: 'Office', participants: 2, status: 'confirmed',
    },
    {
      id: 'demo-5', title: 'Year 5 English', date: new Date(y, m, d + 1),
      startTime: new Date(y, m, d + 1, 9, 30).toISOString(), endTime: new Date(y, m, d + 1, 10, 30).toISOString(),
      type: 'class', location: 'Room 204', participants: 22, status: 'confirmed', subject: 'English',
    },
    {
      id: 'demo-6', title: 'Staff Meeting', date: new Date(y, m, d + 2),
      startTime: new Date(y, m, d + 2, 15, 0).toISOString(), endTime: new Date(y, m, d + 2, 16, 0).toISOString(),
      type: 'meeting', location: 'Staff Room', participants: 12, status: 'confirmed',
    },
    {
      id: 'demo-7', title: 'Year 3 Phonics', date: new Date(y, m, d + 3),
      startTime: new Date(y, m, d + 3, 10, 0).toISOString(), endTime: new Date(y, m, d + 3, 11, 0).toISOString(),
      type: 'session', location: 'Room 102', participants: 20, status: 'confirmed', subject: 'Phonics',
    },
    {
      id: 'demo-8', title: 'Assessment Review', date: new Date(y, m, d + 5),
      startTime: new Date(y, m, d + 5, 13, 0).toISOString(), endTime: new Date(y, m, d + 5, 14, 0).toISOString(),
      type: 'meeting', location: 'Conference Room', participants: 4, status: 'confirmed',
    },
  ];
}

// =============================================================================
// TRANSFORM SESSIONS → CALENDAR EVENTS
// =============================================================================

function sessionsToEvents(sessions: Session[]): CalendarEvent[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.subject || 'Session',
    date: new Date(s.scheduledStart),
    startTime: s.scheduledStart,
    endTime: s.scheduledEnd,
    type: 'session' as const,
    participants: s.participants?.length ?? 0,
    status: s.status,
    subject: s.subject,
  }));
}

// =============================================================================
// EVENT TYPE CONFIG
// =============================================================================

const EVENT_COLORS: Record<string, string> = {
  session: 'bg-blue-500',
  class: 'bg-green-500',
  meeting: 'bg-purple-500',
  group: 'bg-orange-500',
};

const EVENT_DOT_COLORS: Record<string, string> = {
  session: 'bg-blue-500',
  class: 'bg-green-500',
  meeting: 'bg-purple-500',
  group: 'bg-orange-500',
};

// =============================================================================
// CALENDAR GRID
// =============================================================================

function CalendarGrid({
  year,
  month,
  selectedDate,
  onSelectDate,
  events,
}: {
  year: number;
  month: number;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: CalendarEvent[];
}) {
  const days = useMemo(() => getCalendarDays(year, month), [year, month]);
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-0">
      {/* Day headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground border-b">
          {d}
        </div>
      ))}

      {/* Date cells */}
      {days.map((day, i) => {
        const isCurrentMonth = day.getMonth() === month;
        const isToday = isSameDay(day, today);
        const isSelected = isSameDay(day, selectedDate);
        const dayEvents = events.filter((e) => isSameDay(e.date, day));

        return (
          <button
            key={i}
            onClick={() => onSelectDate(day)}
            className={`
              relative flex flex-col items-center justify-start p-1 min-h-[72px] border-b border-r
              transition-colors hover:bg-muted/50
              ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
              ${isSelected ? 'bg-primary/10 ring-1 ring-primary' : ''}
            `}
          >
            <span
              className={`
                inline-flex items-center justify-center h-7 w-7 rounded-full text-sm
                ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                ${isSelected && !isToday ? 'font-semibold' : ''}
              `}
            >
              {day.getDate()}
            </span>
            {/* Event dots */}
            {dayEvents.length > 0 && (
              <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT_COLORS[e.type] || 'bg-muted-foreground'}`}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// EVENT LIST
// =============================================================================

function EventList({ events, title, emptyMessage }: { events: CalendarEvent[]; title: string; emptyMessage: string }) {
  const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{title}</h3>
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${EVENT_COLORS[event.type] || 'bg-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{event.title}</p>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {event.type}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </span>
                )}
                {event.participants > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.participants}
                  </span>
                )}
              </div>
              {event.subject && (
                <Badge variant="secondary" className="mt-1.5 text-xs">
                  {event.subject}
                </Badge>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const { data, isLoading } = useTeacher({ page: 'calendar' });

  // Build events: API sessions + demo fallback
  const events = useMemo(() => {
    if (data?.upcomingSessions && data.upcomingSessions.length > 0) {
      return sessionsToEvents(data.upcomingSessions);
    }
    // Demo mode or no data — use fallback
    return generateFallbackEvents();
  }, [data?.upcomingSessions]);

  // Events for selected date
  const selectedDayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.date, selectedDate)),
    [events, selectedDate],
  );

  // Upcoming events (next 7 days, excluding selected)
  const upcomingEvents = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return events
      .filter((e) => e.date >= start && e.date <= end && !isSameDay(e.date, selectedDate))
      .slice(0, 5);
  }, [events, selectedDate]);

  // Month navigation
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today);
  };

  // Stats
  const totalThisMonth = events.filter(
    (e) => e.date.getMonth() === currentMonth && e.date.getFullYear() === currentYear,
  ).length;
  const todayCount = events.filter((e) => isSameDay(e.date, today)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">View and manage your schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{todayCount} today</Badge>
          <Badge variant="outline">{totalThisMonth} this month</Badge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5 capitalize">
            <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
            {type}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {getMonthName(currentMonth)} {currentYear}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <CalendarGrid
              year={currentYear}
              month={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              events={events}
            />
          </CardContent>
        </Card>

        {/* Sidebar: selected day + upcoming */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate.toLocaleDateString('en-AU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </CardTitle>
              <CardDescription>
                {selectedDayEvents.length === 0
                  ? 'No events'
                  : `${selectedDayEvents.length} event${selectedDayEvents.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventList
                events={selectedDayEvents}
                title="Events"
                emptyMessage="No events scheduled for this day"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming (7 days)</CardTitle>
              <CardDescription>Events coming up soon</CardDescription>
            </CardHeader>
            <CardContent>
              <EventList
                events={upcomingEvents}
                title="Next up"
                emptyMessage="No upcoming events this week"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
