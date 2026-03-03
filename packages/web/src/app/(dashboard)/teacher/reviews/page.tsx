'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { Star, FileText, Brain, Shield, ChevronRight } from 'lucide-react';

export default function TeacherReviewsPage() {
  const { data: teacherData } = useTeacher({ page: 'reviews' });
  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.content.list({})
      .then((res) => setItems(res.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="heading-2">Peer Reviews</h1><p className="text-muted-foreground">Review content from colleagues and community</p></div>
        <Button variant="outline" asChild><Link href="/teacher/reviews/assignments">My Assignments</Link></Button>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />) : items.length > 0 ? items.filter(i => i.status === 'published').map(item => (
          <Card key={item.id}><CardContent className="p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" /><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.type} · {item.subject}</p></div></div><Button size="sm" variant="outline">Review <ChevronRight className="ml-1 h-3 w-3" /></Button></div></CardContent></Card>
        )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No content available for review.</CardContent></Card>}
      </div>
    </div>
  );
}
