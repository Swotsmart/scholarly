'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { ContentItem, AIInsight } from '@/types/teacher';
import { ClipboardCheck, FileText, PenTool, Library, Plus, Search, Brain, Shield, Sparkles } from 'lucide-react';

export default function TeacherAssessmentPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'assessment' });
  const [assessments, setAssessments] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    teacherApi.content.list({ type: 'assessment' })
      .then((res) => setAssessments(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];
  const filtered = assessments.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));
  const published = assessments.filter(a => a.status === 'published').length;
  const drafts = assessments.filter(a => a.status === 'draft').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Assessments</h1>
          <p className="text-muted-foreground">{assessments.length} assessments · {published} published · {drafts} drafts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/teacher/assessment/library"><Library className="mr-2 h-4 w-4" />Library</Link></Button>
          <Button asChild><Link href="/teacher/assessment/builder"><Plus className="mr-2 h-4 w-4" />Create Assessment</Link></Button>
        </div>
      </div>

      {/* AI insight */}
      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-500 shrink-0" />
              <p className="text-sm text-muted-foreground">{insights[0].description}</p>
              <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assessments..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <Card className="border-red-200 dark:border-red-800"><CardContent className="py-4"><p className="text-sm text-red-600">{error}</p></CardContent></Card>}

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)
        ) : filtered.length > 0 ? (
          filtered.map((assessment) => (
            <Card key={assessment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {assessment.type === 'quiz' ? <PenTool className="h-5 w-5 text-primary" /> : <ClipboardCheck className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/teacher/assessment/${assessment.id}`} className="font-medium hover:underline">{assessment.title}</Link>
                        <Badge variant={assessment.status === 'published' ? 'default' : 'secondary'} className="text-xs capitalize">{assessment.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{assessment.type} · {assessment.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {assessment.createdAt && <span>{new Date(assessment.createdAt).toLocaleDateString()}</span>}
                    <Button size="sm" variant="outline" asChild><Link href={`/teacher/grading?assessment=${assessment.id}`}>Grade</Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No assessments found{search ? ` matching "${search}"` : '. Create your first assessment to get started.'}.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
