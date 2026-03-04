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
import { ArrowLeft, FolderOpen, Brain, Shield, Star } from 'lucide-react';

export default function GradingPortfoliosPage() {
  const { data: teacherData } = useTeacher({ page: 'grading-portfolios' });
  const [portfolios, setPortfolios] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    teacherApi.content.list({})
      .then((res) => setPortfolios(res.items.filter(i => i.type === 'resource')))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const insights = teacherData?.insights ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/grading"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div>
          <h1 className="heading-2">Portfolio Grading</h1>
          <p className="text-muted-foreground">Review and assess student portfolios</p>
        </div>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Brain className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)
        ) : portfolios.length > 0 ? (
          portfolios.map((portfolio) => (
            <Card key={portfolio.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2"><FolderOpen className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1">
                    <p className="font-medium">{portfolio.title}</p>
                    <p className="text-sm text-muted-foreground">{portfolio.subject} · {new Date(portfolio.createdAt).toLocaleDateString()}</p>
                    {portfolio.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{portfolio.description}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" asChild><Link href={`/teacher/grading/portfolios/${portfolio.id}`}>Review Portfolio</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No portfolios awaiting review.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
