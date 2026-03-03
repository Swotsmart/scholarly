'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { Map, Brain, Shield, Sparkles } from 'lucide-react';

export default function TeacherJourneysPage() {
  const { data: teacherData } = useTeacher({ page: 'journeys' });
  const [journeys, setJourneys] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.content.list({ type: 'resource' })
      .then((res) => setJourneys(res.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div><h1 className="heading-2">Learning Journeys</h1><p className="text-muted-foreground">Structured learning paths for your students</p></div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30"><CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? [1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>) : journeys.length > 0 ? journeys.map(j => (
          <Card key={j.id} className="group"><CardContent className="p-4"><div className="flex items-start gap-3"><Map className="h-5 w-5 text-primary shrink-0 mt-0.5" /><div><p className="font-medium">{j.title}</p><p className="text-sm text-muted-foreground mt-1">{j.subject}</p>{j.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{j.description}</p>}</div></div></CardContent></Card>
        )) : <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No learning journeys created.</CardContent></Card>}
      </div>
    </div>
  );
}
