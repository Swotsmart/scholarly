'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { Session } from '@/types/teacher';
import { Calendar, Clock, Users, MapPin, Brain, Shield, ChevronRight } from 'lucide-react';

export default function TeacherSchedulingPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'scheduling' });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.sessions.list({ upcoming: true })
      .then((res) => setSessions(res.sessions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const today = sessions.filter(s => new Date(s.scheduledStart).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="heading-2">Scheduling</h1><p className="text-muted-foreground">{sessions.length} upcoming sessions · {today.length} today</p></div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/teacher/scheduling/timetable">Timetable</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/scheduling/relief">Relief</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/scheduling/capacity">Capacity</Link></Button>
          <Button variant="outline" asChild><Link href="/teacher/scheduling/rooms">Rooms</Link></Button>
        </div>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Upcoming Sessions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : sessions.length > 0 ? sessions.slice(0, 10).map(s => {
            const isToday = new Date(s.scheduledStart).toDateString() === new Date().toDateString();
            const time = new Date(s.scheduledStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            const date = isToday ? 'Today' : new Date(s.scheduledStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div>
                  <div><p className="font-medium">{s.participants.map(p => p.learnerProfile.user.displayName).join(', ') || 'Session'}</p><p className="text-sm text-muted-foreground">{date} at {time}</p></div>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{s.status}</Badge>
              </div>
            );
          }) : <p className="text-sm text-muted-foreground py-4 text-center">No upcoming sessions.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
