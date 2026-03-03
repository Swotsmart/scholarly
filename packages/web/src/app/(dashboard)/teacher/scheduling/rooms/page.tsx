'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { Session } from '@/types/teacher';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';

export default function RoomsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.sessions.list({ upcoming: true })
      .then((res) => setSessions(res.sessions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // Group by room/location (using session metadata)
  const today = sessions.filter(s => new Date(s.scheduledStart).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/scheduling"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">Room Bookings</h1><p className="text-muted-foreground">View room allocations and availability</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Today's Room Usage</CardTitle><CardDescription>{today.length} sessions scheduled today</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />) : today.length > 0 ? today.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">{s.participants.map(p => p.learnerProfile.user.displayName).join(', ') || 'Session'}</p><p className="text-xs text-muted-foreground">{new Date(s.scheduledStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p></div></div>
              <Badge variant="outline" className="text-xs capitalize">{s.status}</Badge>
            </div>
          )) : <p className="text-sm text-muted-foreground py-4 text-center">No sessions scheduled today.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
