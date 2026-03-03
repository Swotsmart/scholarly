'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { CurriculumStandard } from '@/types/teacher';
import { Search, BookOpen, CheckCircle2, Brain, Shield, Sparkles } from 'lucide-react';

export default function TeacherStandardsPage() {
  const { data: teacherData } = useTeacher({ page: 'standards' });
  const [standards, setStandards] = useState<CurriculumStandard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.curriculum.getStandards()
      .then((res) => setStandards(res.standards))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const filtered = standards.filter(s => !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Curriculum Standards</h1>
        <p className="text-muted-foreground">Browse and align content to curriculum standards ({standards.length} standards loaded)</p>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search standards by code or title..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      {error && <Card className="border-red-200"><CardContent className="py-4"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : filtered.length > 0 ? (
          filtered.map((standard) => (
            <Card key={standard.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 mt-0.5"><BookOpen className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs font-mono">{standard.code}</Badge><span className="font-medium">{standard.title}</span></div>
                    {standard.description && <p className="text-sm text-muted-foreground mt-1">{standard.description}</p>}
                    <div className="flex gap-2 mt-2">
                      {standard.subject && <Badge variant="secondary" className="text-xs">{standard.subject}</Badge>}
                      {standard.yearLevel && <Badge variant="secondary" className="text-xs">{standard.yearLevel}</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No standards found{search ? ` matching "${search}"` : '.'}.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
