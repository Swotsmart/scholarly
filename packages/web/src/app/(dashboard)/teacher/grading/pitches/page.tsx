'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { ArrowLeft, Presentation, Brain, Shield, Star, Clock, CheckCircle2 } from 'lucide-react';

export default function GradingPitchesPage() {
  const { data: teacherData } = useTeacher({ page: 'grading-pitches' });
  const [pitches, setPitches] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Pitches are a content type
    teacherApi.content.list({})
      .then((res) => setPitches(res.items.filter(i => i.type === 'activity')))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/grading"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div>
          <h1 className="heading-2">Pitch Grading</h1>
          <p className="text-muted-foreground">Review and grade student pitch presentations</p>
        </div>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)
        ) : pitches.length > 0 ? (
          pitches.map((pitch) => (
            <Card key={pitch.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><Presentation className="h-5 w-5 text-primary" /></div>
                    <div><p className="font-medium">{pitch.title}</p><p className="text-sm text-muted-foreground">{pitch.subject} · {new Date(pitch.createdAt).toLocaleDateString()}</p></div>
                  </div>
                  <Button size="sm">Review</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No pitches awaiting review.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
