'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { ArrowLeft, ClipboardCheck, Clock } from 'lucide-react';

export default function ReviewAssignmentsPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.content.list({})
      .then((res) => setItems(res.items.filter(i => i.status === 'draft')))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/reviews"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">Review Assignments</h1><p className="text-muted-foreground">{items.length} items assigned to you for review</p></div>
      </div>
      <div className="space-y-3">
        {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : items.length > 0 ? items.map(item => (
          <Card key={item.id}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-primary" /><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.type} · Created {new Date(item.createdAt).toLocaleDateString()}</p></div></div><Button size="sm" asChild><Link href={`/teacher/reviews/assignments/${item.id}`}>Review</Link></Button></div></CardContent></Card>
        )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No pending review assignments.</CardContent></Card>}
      </div>
    </div>
  );
}
