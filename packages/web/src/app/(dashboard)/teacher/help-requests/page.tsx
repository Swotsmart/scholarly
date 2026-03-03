'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { Notification } from '@/types/teacher';
import { HelpCircle, Clock, CheckCircle2 } from 'lucide-react';

export default function HelpRequestsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.dashboard.getNotifications()
      .then((res) => setNotifications(res.notifications))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="heading-2">Help Requests</h1><p className="text-muted-foreground">{notifications.length} requests</p></div>
      <div className="space-y-3">
        {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : notifications.length > 0 ? notifications.map(n => (
          <Card key={n.id}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><HelpCircle className="h-5 w-5 text-primary" /><div><p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.message}</p><p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</p></div></div><Badge variant={n.read ? 'secondary' : 'default'}>{n.read ? 'Resolved' : 'Open'}</Badge></div></CardContent></Card>
        )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No help requests.</CardContent></Card>}
      </div>
    </div>
  );
}
