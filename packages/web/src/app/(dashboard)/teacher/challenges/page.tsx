'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem } from '@/types/teacher';
import { Plus, Lightbulb, Users, Clock, Trophy } from 'lucide-react';

export default function TeacherChallengesPage() {
  const [challenges, setChallenges] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.content.list({ type: 'activity' })
      .then((res) => setChallenges(res.items))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="heading-2">Challenges</h1><p className="text-muted-foreground">{challenges.length} active challenges</p></div>
        <Button asChild><Link href="/teacher/challenges/create"><Plus className="mr-2 h-4 w-4" />Create Challenge</Link></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-28 w-full" /></CardContent></Card>)
        ) : challenges.length > 0 ? (
          challenges.map((challenge) => (
            <Card key={challenge.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2"><Trophy className="h-5 w-5 text-amber-500" /></div>
                  <div className="flex-1">
                    <p className="font-medium">{challenge.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{challenge.subject}</p>
                    {challenge.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{challenge.description}</p>}
                  </div>
                  <Badge variant={challenge.status === 'published' ? 'default' : 'secondary'} className="text-xs capitalize">{challenge.status}</Badge>
                </div>
                <div className="mt-3"><Button size="sm" variant="outline" className="w-full" asChild><Link href={`/teacher/challenges/${challenge.id}`}>Manage</Link></Button></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No challenges created yet.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
