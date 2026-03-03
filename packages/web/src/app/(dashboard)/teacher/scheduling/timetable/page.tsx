'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { Session } from '@/types/teacher';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = Array.from({ length: 9 }, (_, i) => i + 8); // 8am - 4pm

export default function TimetablePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    teacherApi.sessions.list({ upcoming: true, page: 1 })
      .then((res) => setSessions(res.sessions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Group sessions by day of week
  const sessionsByDay: Record<string, Session[]> = {};
  DAYS.forEach(d => { sessionsByDay[d] = []; });
  sessions.forEach(s => {
    const day = new Date(s.scheduledStart).toLocaleDateString('en-US', { weekday: 'long' });
    if (sessionsByDay[day]) sessionsByDay[day].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/scheduling"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">Timetable</h1><p className="text-muted-foreground">Weekly view of your teaching schedule</p></div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This Week</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left font-medium w-20">Time</th>
                  {DAYS.map(day => <th key={day} className="p-3 text-left font-medium">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => (
                  <tr key={hour} className="border-b">
                    <td className="p-3 text-sm text-muted-foreground">{hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}</td>
                    {DAYS.map(day => {
                      const daySessions = sessionsByDay[day]?.filter(s => new Date(s.scheduledStart).getHours() === hour) || [];
                      return (
                        <td key={day} className="p-2 align-top">
                          {daySessions.map(s => (
                            <div key={s.id} className="rounded-md bg-primary/10 p-2 mb-1 text-xs">
                              <p className="font-medium truncate">{s.participants.map(p => p.learnerProfile.user.displayName).join(', ') || 'Session'}</p>
                              <Badge variant="outline" className="text-[10px] mt-1 capitalize">{s.status}</Badge>
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
